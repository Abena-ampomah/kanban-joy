import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await userClient.auth.getUser();

    // Fetch current tasks for context
    let taskContext = "";
    if (user) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, description, status, priority:task_priorities(name)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (tasks && tasks.length > 0) {
        taskContext = "\n\nCurrent tasks:\n" + tasks.map((t: any) =>
          `- [${t.id}] "${t.title}" (status: ${t.status}, priority: ${t.priority?.name || 'none'})`
        ).join("\n");
      }
    }

    const systemPrompt = `You are TaskFlow AI, an intelligent task management assistant. You help users manage their kanban board tasks.

You can help with:
- Answering questions about tasks
- Suggesting task edits  
- Moving tasks between columns (todo, in_progress, completed)
- Creating new tasks

When the user asks to edit, move, or create a task, use tool calling to perform the action.
${taskContext}

Be concise, helpful, and friendly. Use markdown for formatting.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error: " + response.status);
    }

    const aiResult = await response.json();
    const choice = aiResult.choices?.[0];
    let finalContent = choice?.message?.content || "";

    // Handle tool calls
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        const fn = tc.function;
        const args = JSON.parse(fn.arguments);

        if (fn.name === "update_task" && user) {
          const updates: any = {};
          if (args.title) updates.title = args.title;
          if (args.description) updates.description = args.description;
          if (args.status) updates.status = args.status;

          const { error } = await supabase.from("tasks").update(updates).eq("id", args.task_id);
          if (error) {
            finalContent += `\n\n❌ Failed to update task: ${error.message}`;
          } else {
            finalContent += "\n\n[TASK_UPDATED]";
            if (args.status) finalContent += `\n✅ Task moved to **${args.status.replace("_", " ")}**!`;
            if (args.title) finalContent += `\n✅ Title updated!`;
          }
        }

        if (fn.name === "create_task" && user) {
          const { error } = await supabase.from("tasks").insert({
            title: args.title,
            description: args.description || "",
            status: args.status || "todo",
            created_by: user.id,
          });
          if (error) {
            finalContent += `\n\n❌ Failed to create task: ${error.message}`;
          } else {
            finalContent += "\n\n[TASK_CREATED]\n✅ Task created!";
          }
        }
      }
    }

    // Stream the final response
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          { role: "assistant", content: finalContent || "I've processed your request." },
        ],
        stream: true,
      }),
    });

    if (!streamResponse.ok) throw new Error("Stream error");

    // If we had tool calls, prepend tool results
    if (choice?.message?.tool_calls && finalContent) {
      const encoder = new TextEncoder();
      const toolResultChunk = `data: ${JSON.stringify({ choices: [{ delta: { content: finalContent } }] })}\n\n`;

      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(toolResultChunk));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(streamResponse.body, {
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
