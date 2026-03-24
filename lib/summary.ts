/**
 * EPIC 5: Output & UX
 * US-09: Provide summary explanation
 */

import type { ProjectNode, DataFlow, AnalysisResult } from "./analyzer";

export function generateSummary(result: AnalysisResult): string {
  const { nodes, flows, structure } = result;
  const entryNodes = nodes.filter((n) => n.type === "entry");
  const routeNodes = nodes.filter((n) => n.type === "route");
  const serviceNodes = nodes.filter((n) => n.type === "service");
  const dbNodes = nodes.filter((n) => n.type === "data_store");

  const parts: string[] = [];

  if (entryNodes.length > 0) {
    const names = entryNodes.map((n) => n.name).join(", ");
    parts.push(`Entry point(s): ${names}.`);
  }

  if (routeNodes.length > 0) {
    parts.push("The app exposes HTTP routes that receive incoming requests.");
  }

  if (serviceNodes.length > 0) {
    const names = serviceNodes.map((n) => n.name).join(", ");
    parts.push(`Core components include: ${names}.`);
  }

  if (dbNodes.length > 0) {
    const hasInferred = dbNodes.some((n) => n.inferred);
    parts.push(
      hasInferred
        ? "A data store is inferred; the app likely persists data."
        : "Database/data store usage was detected."
    );
  }

  if (flows.length > 0) {
    const flowDesc = flows
      .slice(0, 5)
      .map((f) => `${f.from} → ${f.to}`)
      .join("; ");
    parts.push(`Data flows: ${flowDesc}.`);
  }

  const total = (structure.totalFiles as number) ?? 0;
  if (total > 0) {
    parts.push(`The analysis scanned ${total} source files.`);
  }

  if (parts.length === 0) {
    return "The codebase structure could not be fully determined. Try a repository with clearer entry points, routes, or service patterns.";
  }

  return parts.join(" ").slice(0, 600) + (parts.join(" ").length > 600 ? "..." : "");
}
