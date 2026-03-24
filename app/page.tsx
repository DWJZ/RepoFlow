"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiagramView } from "@/components/DiagramView";
import { ChatPanel } from "@/components/ChatPanel";
import { Github, Loader2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalysisResult {
  repo: { owner: string; name: string };
  diagram: {
    mermaid: string;
    nodes: { id: string; name: string; type: string; files: string[] }[];
    flows: { from: string; to: string; label?: string }[];
  };
  fileLinks: Record<string, string[]>;
  summary: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<{ message: string; suggestion?: string } | null>(null);

  const analyze = async () => {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error ?? "Analysis failed",
          suggestion: data.suggestion,
        });
        return;
      }

      setResult(data);
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : "Request failed",
        suggestion: "Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const diagramContext = result
    ? {
        repo: result.repo,
        nodes: result.diagram.nodes,
        flows: result.diagram.flows,
        summary: result.summary,
        fileLinks: result.fileLinks,
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <Github className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">RepoFlow</h1>
          <span className="text-muted-foreground text-sm">— Data flow from code</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-8">
        <section>
          <h2 className="text-lg font-medium mb-2">Analyze a GitHub repository</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enter a public GitHub URL. We&apos;ll clone it, analyze the structure, and generate a
            data flow diagram.
          </p>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && analyze()}
            />
            <Button onClick={analyze} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">{error.message}</p>
                {error.suggestion && (
                  <p className="text-sm text-muted-foreground mt-1">{error.suggestion}</p>
                )}
              </div>
            </div>
          )}
        </section>

        {result && (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium">
                  {result.repo.owner}/{result.repo.name}
                </h2>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                {result.summary}
              </div>
            </section>

            <Tabs defaultValue="diagram" className="w-full">
              <TabsList>
                <TabsTrigger value="diagram">Diagram</TabsTrigger>
                <TabsTrigger value="chat">Ask Questions</TabsTrigger>
              </TabsList>
              <TabsContent value="diagram" className="mt-4">
                <DiagramView
                  mermaidCode={result.diagram.mermaid}
                  fileLinks={result.fileLinks}
                  nodes={result.diagram.nodes}
                />
              </TabsContent>
              <TabsContent value="chat" className="mt-4">
                <ChatPanel diagramContext={diagramContext} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
