/**
 * EPIC 4: Conversational Interface
 * US-07: Ask questions about the diagram, US-08: Explain diagram elements
 * Uses Ollama (local open-source LLM) by default; falls back to OpenAI when API key is set.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a helpful assistant that explains codebase structure and data flow from a DATA FLOW DIAGRAM.
You are given a complete data flow diagram with: components (nodes), data flow edges, and a summary.
Use this information to answer questions. Do NOT say the information is insufficient - you have the full diagram structure.
- For "How does data flow?" describe the flow path using the components and edges provided
- For "What talks to the database?" identify components that connect to the Database/data store
- For "What is the entry point?" name the entry component(s)
- Reference specific component names and file paths when relevant
- Keep answers focused and useful for a mid-level developer`;

function formatDiagramContext(ctx: {
  repo?: { owner: string; name: string };
  nodes: { id: string; name: string; type: string; files: string[] }[];
  flows: { from: string; to: string; label?: string }[];
  summary?: string;
  fileLinks?: Record<string, string[]>;
}): string {
  const repo = ctx.repo ? `${ctx.repo.owner}/${ctx.repo.name}` : "the repository";
  const lines: string[] = [
    `DATA FLOW DIAGRAM for ${repo}`,
    "",
    "=== SUMMARY ===",
    ctx.summary || "(No summary)",
    "",
    "=== COMPONENTS (nodes in the diagram) ===",
  ];

  for (const node of ctx.nodes) {
    const typeDesc =
      node.type === "entry"
        ? "entry point"
        : node.type === "route"
          ? "HTTP routes"
          : node.type === "service"
            ? "service/module"
            : node.type === "data_store"
              ? "database/data store"
              : "module";
    const filePreview =
      node.files?.length > 0
        ? ` Files: ${node.files.slice(0, 5).join(", ")}${node.files.length > 5 ? "..." : ""}`
        : "";
    lines.push(`- ${node.name} (${typeDesc})${filePreview}`);
  }

  lines.push("", "=== DATA FLOWS (how data moves between components) ===");
  for (const flow of ctx.flows) {
    const label = flow.label ? ` [${flow.label}]` : "";
    lines.push(`- ${flow.from} --${label}--> ${flow.to}`);
  }

  return lines.join("\n");
}

function getOpenAIClient(): { client: OpenAI; model: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  const useOllama = !apiKey || apiKey === "ollama" || apiKey === "local";

  if (useOllama) {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
    const model = process.env.OLLAMA_MODEL ?? "deepseek-r1:8b";
    return {
      client: new OpenAI({ baseURL: baseUrl, apiKey: "ollama" }),
      model,
    };
  }

  return {
    client: new OpenAI({ apiKey }),
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, diagramContext } = body as {
      question?: string;
      diagramContext?: {
        repo?: { owner: string; name: string };
        nodes: { id: string; name: string; type: string; files: string[] }[];
        flows: { from: string; to: string; label?: string }[];
        summary?: string;
        fileLinks?: Record<string, string[]>;
      };
    };

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { success: false, error: "Question is required" },
        { status: 400 }
      );
    }

    if (!diagramContext?.nodes?.length) {
      return NextResponse.json(
        {
          success: false,
          error: "No diagram context. Analyze a repository first before asking questions.",
        },
        { status: 400 }
      );
    }

    const { client, model } = getOpenAIClient();

    const contextStr = formatDiagramContext(diagramContext);
    const userMessage = `${contextStr}\n\n---\nUser question: ${question}`;

    const response = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const answer =
      response.choices[0]?.message?.content ?? "I couldn't generate a response.";

    return NextResponse.json({ success: true, answer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: `Chat failed: ${msg}` },
      { status: 500 }
    );
  }
}
