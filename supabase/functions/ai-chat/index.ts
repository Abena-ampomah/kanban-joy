import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-exp";

// Helper to create a user-scoped Supabase client
function getUserClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function getUser(authHeader: string) {
  const client = getUserClient(authHeader);
  const { data: { user } } = await client.auth.getUser();
  return user;
}

// Fetch tasks using the USER'S permissions (RLS)
async function fetchTaskContext(authHeader: string, workspaceId?: string) {
  const supabase = getUserClient(authHeader);
  let query = supabase
    .from("tasks")
    .select("id, title, description, status, priority:task_priorities(name)")
    .order("created_at", { ascending: false });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.is("workspace_id", null);
  }

  const { data: tasks } = await query.limit(50); // Context window limit

  if (!tasks?.length) return "";
  return `\n\nCurrent tasks in ${workspaceId ? "this workspace" : "your personal space"}:\n` + tasks.map((t: { id: string, title: string, status: string, priority?: { name?: string } }) =>
    `- [${t.id}] "${t.title}" (status: ${t.status}, priority: ${t.priority?.name || "none"})`
  ).join("\n");
}

const tools = [
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing task's title, description, or status",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The UUID of the task to update" },
          title: { type: "string", description: "New title (optional)" },
          description: { type: "string", description: "New description (optional)" },
          status: { type: "string", enum: ["todo", "in_progress", "completed"], description: "New status (optional)" },
        },
        required: ["task_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description (optional)" },
          status: { type: "string", enum: ["todo", "in_progress", "completed"], description: "Initial status" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
];


async function executeToolCalls(toolCalls: { function: { name: string, arguments: string } }[], authHeader: string, user: { id: string } | null, workspaceId?: string) {
  const supabase = getUserClient(authHeader);
  const results: string[] = [];

  for (const tc of toolCalls) {
    const args = JSON.parse(tc.function.arguments);

    if (tc.function.name === "update_task") {
      const updates: Record<string, string> = {};
      if (args.title) updates.title = args.title;
      if (args.description) updates.description = args.description;
      if (args.status) updates.status = args.status;

      const { error } = await supabase.from("tasks").update(updates).eq("id", args.task_id);
      if (error) {
        // This will now catch RLS errors if the user tries to update a task they don't own/manage
        results.push(`❌ Failed to update task: ${error.message}`);
      } else {
        if (args.status) results.push(`✅ Task moved to **${args.status.replace("_", " ")}**!`);
        if (args.title) results.push(`✅ Title updated!`);
        if (args.description) results.push(`✅ Description updated!`);
        results.push("[TASK_UPDATED]");
      }
    }

    if (tc.function.name === "create_task") {
      if (!user) {
        results.push("❌ Error: Could not identify user.");
        continue;
      }

      const { error } = await supabase.from("tasks").insert({
        title: args.title,
        description: args.description || "",
        status: args.status || "todo",
        created_by: user.id,
        workspace_id: workspaceId || null,
      });
      if (error) {
        results.push(`❌ Failed to create task: ${error.message}`);
      } else {
        results.push(`✅ Task "${args.title}" created!`);
        results.push("[TASK_CREATED]");
      }
    }
  }

  return results.join("\n");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, workspaceId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const user = await getUser(authHeader);

    const taskContext = await fetchTaskContext(authHeader, workspaceId);

    const systemPrompt = `You are TaskFlow AI, an intelligent task management assistant. You help users manage their kanban board tasks.

You can help with:
- Answering questions about tasks
- Editing tasks (title, description, status)
- Moving tasks between columns (todo, in_progress, completed)
- Creating new tasks

When the user asks to edit, move, or create a task, use the provided tool functions. Always confirm the action after completing it.
${taskContext}

Be concise, helpful, and friendly. Use markdown for formatting.`;

    // First call: let the model decide if it needs tools
    const firstResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        stream: false,
      }),
    });

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (firstResponse.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error: " + firstResponse.status);
    }

    const aiResult = await firstResponse.json();
    const choice = aiResult.choices?.[0];

    // If no tool calls, stream a normal response
    if (!choice?.message?.tool_calls?.length) {
      const streamResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      });
      if (!streamResponse.ok) throw new Error("Stream error");
      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Execute tool calls
    const toolResults = await executeToolCalls(choice.message.tool_calls, authHeader, user, workspaceId);

    // Build tool call result messages for the follow-up
    const toolMessages = choice.message.tool_calls.map((tc: { id: string }) => ({
      role: "tool",
      tool_call_id: tc.id,
      content: toolResults,
    }));

    // Stream the final response with tool results context
    const streamResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          choice.message,
          ...toolMessages,
        ],
        stream: true,
      }),
    });

    if (!streamResponse.ok) throw new Error("Stream error");

    // Prepend tool results, then stream
    const encoder = new TextEncoder();
    const toolChunk = `data: ${JSON.stringify({ choices: [{ delta: { content: toolResults + "\n\n" } }] })}\n\n`;

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      await writer.write(encoder.encode(toolChunk));
      const reader = streamResponse.body!.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
      await writer.close();
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
