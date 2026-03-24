/**
 * EPIC 1: Repository Intake
 * US-01: Validate GitHub URL, US-02: Fetch repository
 */

const GITHUB_URL_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(?:\/)?(?:\?.*)?$/;
const GIT_SSH_REGEX = /^git@github\.com:([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(?:\.git)?$/;

const MAX_REPO_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

export interface RepoInfo {
  owner: string;
  name: string;
  cloneUrl: string;
}

export interface FetchResult {
  success: boolean;
  path?: string;
  error?: string;
  errorCode?: "invalid_url" | "not_found" | "timeout" | "too_large" | "clone_failed" | "unsupported";
}

export function validateGitHubUrl(url: string): { valid: boolean; repo?: RepoInfo; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter a GitHub repository URL" };
  }

  let match = trimmed.match(GITHUB_URL_REGEX);
  if (match) {
    return {
      valid: true,
      repo: {
        owner: match[1],
        name: match[2].replace(/\.git$/, ""),
        cloneUrl: `https://github.com/${match[1]}/${match[2].replace(/\.git$/, "")}.git`,
      },
    };
  }

  match = trimmed.match(GIT_SSH_REGEX);
  if (match) {
    return {
      valid: true,
      repo: {
        owner: match[1],
        name: match[2],
        cloneUrl: `https://github.com/${match[1]}/${match[2]}.git`,
      },
    };
  }

  return {
    valid: false,
    error: "Invalid GitHub URL. Use format: https://github.com/owner/repo or git@github.com:owner/repo",
  };
}

export { MAX_REPO_SIZE_BYTES };
