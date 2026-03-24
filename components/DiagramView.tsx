"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";

interface DiagramViewProps {
  mermaidCode: string;
  fileLinks?: Record<string, string[]>;
  nodes?: { id: string; name: string; type: string }[];
  className?: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  flowchart: { useMaxWidth: true, htmlLabels: true },
});

export function DiagramView({ mermaidCode, fileLinks = {}, nodes = [], className }: DiagramViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!mermaidCode.trim()) {
      setSvg("");
      setError(null);
      return;
    }
    setError(null);
    const render = async () => {
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, mermaidCode);
        setSvg(rendered);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to render diagram");
        setSvg("");
      }
    };
    render();
  }, [mermaidCode]);

  const selectedFiles = selectedNode && fileLinks[selectedNode] ? fileLinks[selectedNode] : [];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="rounded-xl border border-border bg-card p-4 overflow-auto min-h-[200px]">
        {error && (
          <div className="text-amber-500 text-sm p-4 bg-amber-500/10 rounded-lg">{error}</div>
        )}
        {svg && !error && (
          <div
            ref={containerRef}
            className="mermaid flex justify-center"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
      {nodes.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Components & Files</h4>
          <div className="flex flex-wrap gap-2">
            {nodes.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelectedNode(selectedNode === n.id ? null : n.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  selectedNode === n.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {n.name}
              </button>
            ))}
          </div>
          {selectedFiles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">
                Files for {nodes.find((n) => n.id === selectedNode)?.name}:
              </p>
              <ul className="text-xs font-mono text-foreground space-y-1">
                {selectedFiles.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
