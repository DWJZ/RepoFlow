/**
 * API: Analyze GitHub repository
 * Validates URL, clones, analyzes, returns diagram + structure + summary
 */

import { NextRequest, NextResponse } from "next/server";
import { validateGitHubUrl } from "@/lib/github";
import { fetchRepository } from "@/lib/repo-fetcher";
import { analyzeCodebase } from "@/lib/analyzer";
import { generateMermaidDiagram, getNodeFileLinks } from "@/lib/diagram";
import { generateSummary } from "@/lib/summary";
import { toUserFriendlyError } from "@/lib/errors";
import * as fs from "fs";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    const validation = validateGitHubUrl(url);
    if (!validation.valid || !validation.repo) {
      const err = toUserFriendlyError("invalid_url");
      return NextResponse.json(
        { success: false, error: validation.error ?? err.message, suggestion: err.suggestion },
        { status: 400 }
      );
    }

    const fetchResult = await fetchRepository(validation.repo);
    if (!fetchResult.success) {
      const err = toUserFriendlyError(fetchResult.errorCode as string);
      return NextResponse.json(
        {
          success: false,
          error: fetchResult.error ?? err.message,
          suggestion: err.suggestion,
        },
        { status: 400 }
      );
    }

    const repoPath = fetchResult.path!;
    let analysis;
    try {
      analysis = analyzeCodebase(repoPath);
    } catch (e) {
      const err = toUserFriendlyError("parse_failed");
      return NextResponse.json(
        { success: false, error: err.message, suggestion: err.suggestion },
        { status: 500 }
      );
    } finally {
      try {
        fs.rmSync(repoPath, { recursive: true });
      } catch {
        // ignore cleanup errors
      }
    }

    const mermaid = generateMermaidDiagram(analysis.nodes, analysis.flows);
    const fileLinks = getNodeFileLinks(analysis.nodes);
    const summary = generateSummary(analysis);

    return NextResponse.json({
      success: true,
      repo: { owner: validation.repo.owner, name: validation.repo.name },
      diagram: { mermaid, nodes: analysis.nodes, flows: analysis.flows },
      fileLinks,
      summary,
      structure: analysis.structure,
    });
  } catch (e) {
    const err = toUserFriendlyError("unknown");
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        suggestion: err.suggestion,
      },
      { status: 500 }
    );
  }
}
