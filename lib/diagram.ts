/**
 * EPIC 3: Diagram Generation
 * US-05: Generate Mermaid data flow diagram, US-06: Link diagram to code
 */

import type { ProjectNode, DataFlow } from "./analyzer";

function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_") || "node";
}

/** Sanitize label text - Mermaid treats ()[] and similar as shape syntax */
function sanitizeMermaidLabel(label: string): string {
  return label
    .replace(/[()[\]<>{}|]/g, " ") // remove Mermaid syntax chars
    .replace(/\s+/g, " ")
    .trim() || "node";
}

export function generateMermaidDiagram(nodes: ProjectNode[], flows: DataFlow[]): string {
  const lines: string[] = ["flowchart LR"];

  const shapeMap: Record<ProjectNode["type"], string> = {
    entry: "([{{id}}])",
    route: "[[{{id}}]]",
    service: "[[{{id}}]]",
    data_store: "[({{id}})]",
    module: "[[{{id}}]]",
  };

  for (const node of nodes) {
    const safeId = sanitizeMermaidId(node.id);
    const label = sanitizeMermaidLabel(node.name);
    const shape = shapeMap[node.type].replace("{{id}}", label);
    lines.push(`  ${safeId}${shape}`);
  }

  for (const flow of flows) {
    const fromId = sanitizeMermaidId(flow.from);
    const toId = sanitizeMermaidId(flow.to);
    const label = flow.label ? `|${flow.label}|` : "";
    lines.push(`  ${fromId} -->${label} ${toId}`);
  }

  return lines.join("\n");
}

export function getNodeFileLinks(nodes: ProjectNode[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const node of nodes) {
    if (node.files.length > 0) {
      map[node.id] = node.files;
    }
  }
  return map;
}
