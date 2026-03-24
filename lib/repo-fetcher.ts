/**
 * EPIC 1: Repository Intake
 * US-02: Fetch repository code (clone with size limit, timeout handling)
 */

import { simpleGit, SimpleGit } from "simple-git";
import * as fs from "fs";
import * as path from "path";
import { MAX_REPO_SIZE_BYTES } from "./github";
import type { RepoInfo } from "./github";

const CLONE_TIMEOUT_MS = 120000; // 2 minutes
const REPOS_DIR = path.join(process.cwd(), ".repos");

const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  ".cache",
];

function getDirSize(dirPath: string): number {
  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (IGNORE_DIRS.some((d) => entry.name === d || fullPath.includes(`/${d}/`))) continue;
      if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
      if (size > MAX_REPO_SIZE_BYTES) break;
    }
  } catch {
    // ignore
  }
  return size;
}

export async function fetchRepository(repo: RepoInfo): Promise<{
  success: boolean;
  path?: string;
  error?: string;
  errorCode?: string;
}> {
  const targetDir = path.join(REPOS_DIR, `${repo.owner}_${repo.name}`);
  if (fs.existsSync(targetDir)) {
    try {
      fs.rmSync(targetDir, { recursive: true });
    } catch {
      // continue
    }
  }

  fs.mkdirSync(REPOS_DIR, { recursive: true });

  const git: SimpleGit = simpleGit({ baseDir: process.cwd() });

  const cloneWithTimeout = () =>
    Promise.race([
      git.clone(repo.cloneUrl, targetDir, ["--depth", "1", "--single-branch"]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CLONE_TIMEOUT_MS)
      ),
    ]);

  try {
    await cloneWithTimeout();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Repository not found") || msg.includes("404")) {
      return { success: false, error: "Repository not found or is private", errorCode: "not_found" };
    }
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return { success: false, error: "Clone timed out. Try again or use a smaller repository.", errorCode: "timeout" };
    }
    return {
      success: false,
      error: `Failed to clone: ${msg}`,
      errorCode: "clone_failed",
    };
  }

  const size = getDirSize(targetDir);
  if (size > MAX_REPO_SIZE_BYTES) {
    try {
      fs.rmSync(targetDir, { recursive: true });
    } catch {
      // ignore
    }
    return {
      success: false,
      error: `Repository exceeds 200MB limit. Please use a smaller repository.`,
      errorCode: "too_large",
    };
  }

  return { success: true, path: targetDir };
}
