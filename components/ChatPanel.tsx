"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DiagramContext {
  repo?: { owner: string; name: string };
  nodes: { id: string; name: string; type: string; files: string[] }[];
  flows: { from: string; to: string; label?: string }[];
  summary?: string;
  fileLinks?: Record<string, string[]>;
}

interface ChatPanelProps {
  diagramContext: DiagramContext | null;
  disabled?: boolean;
  className?: string;
}

const SUGGESTED_QUESTIONS = [
  "How does data flow?",
  "What talks to the database?",
  "What is the entry point?",
];

export function ChatPanel({ diagramContext, disabled, className }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || !diagramContext || loading) return;

    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          diagramContext: {
            repo: diagramContext.repo,
            nodes: diagramContext.nodes,
            flows: diagramContext.flows,
            summary: diagramContext.summary,
            fileLinks: diagramContext.fileLinks,
          },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `Error: ${data.error ?? "Could not get response"}`,
          },
        ]);
        return;
      }

      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? "" }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Error: ${e instanceof Error ? e.message : "Request failed"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col border border-border rounded-xl bg-card overflow-hidden", className)}>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-medium">Ask about the diagram</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Questions like &quot;How does data flow?&quot; or &quot;What talks to the database?&quot;
        </p>
      </div>

      <div className="h-[320px] min-h-[200px] max-h-[70vh] resize-y overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={disabled}
                  className="text-left text-sm px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-3 py-2 text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0",
              m.role === "user"
                ? "ml-8 bg-primary/20"
                : "mr-8 bg-muted"
            )}
          >
            {m.role === "user" ? (
              m.content
            ) : (
              <ReactMarkdown>{m.content}</ReactMarkdown>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form
        className="p-4 border-t border-border flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a component or the flow..."
          disabled={disabled || loading}
          className="flex-1"
        />
        <Button type="submit" disabled={disabled || loading || !input.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
