import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { role: "user" | "assistant"; content: string };

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: allMsgs }),
      });

      if (resp.status === 429) {
        toast({ title: "Rate limited", description: "Please try again in a moment.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Credits needed", description: "Please add credits to your workspace.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "" || line.startsWith(":")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {}
        }
      }

      // Check if AI requested task actions
      if (assistantSoFar.includes("[TASK_UPDATED]") || assistantSoFar.includes("[TASK_MOVED]") || assistantSoFar.includes("[TASK_CREATED]")) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    } catch (e) {
      toast({ title: "AI Error", description: "Could not reach AI assistant.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            <div className="gradient-header px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary-foreground" />
                <span className="font-display font-semibold text-primary-foreground text-sm">AI Task Assistant</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm mt-8">
                  <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Hi! I'm your task assistant.</p>
                  <p className="text-xs mt-1">Ask me to create, edit, or move tasks!</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:m-0">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about tasks..."
                  className="flex-1 text-sm"
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full gradient-header shadow-lg flex items-center justify-center z-50"
      >
        {open ? <X className="h-6 w-6 text-primary-foreground" /> : <MessageSquare className="h-6 w-6 text-primary-foreground" />}
      </motion.button>
    </>
  );
}
