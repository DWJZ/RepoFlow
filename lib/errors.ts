/**
 * EPIC 5: Output & UX
 * US-10: Handle errors gracefully - clear feedback, actionable next steps
 */

export type ErrorCode =
  | "invalid_url"
  | "not_found"
  | "timeout"
  | "too_large"
  | "clone_failed"
  | "unsupported"
  | "parse_failed"
  | "unknown";

export interface UserFriendlyError {
  message: string;
  code: ErrorCode;
  suggestion: string;
}

const ERROR_MAP: Record<ErrorCode, UserFriendlyError> = {
  invalid_url: {
    message: "Invalid GitHub URL",
    code: "invalid_url",
    suggestion: "Use format: https://github.com/owner/repo (public repos only)",
  },
  not_found: {
    message: "Repository not found or is private",
    code: "not_found",
    suggestion: "Check the URL and ensure the repo is public. Private repos are not supported in MVP.",
  },
  timeout: {
    message: "Clone timed out",
    code: "timeout",
    suggestion: "Try again or use a smaller repository. Large repos may take longer.",
  },
  too_large: {
    message: "Repository exceeds 200MB limit",
    code: "too_large",
    suggestion: "Use a smaller repository or a shallow clone of a specific subdirectory.",
  },
  clone_failed: {
    message: "Failed to clone repository",
    code: "clone_failed",
    suggestion: "Verify the URL, check your network connection, and ensure the repo exists.",
  },
  unsupported: {
    message: "Unsupported repository or language",
    code: "unsupported",
    suggestion: "MVP supports common stacks (Node, Python, etc.). Try a standard web app repo.",
  },
  parse_failed: {
    message: "Could not parse codebase structure",
    code: "parse_failed",
    suggestion: "The repo may use unusual patterns. A best-effort diagram was still generated.",
  },
  unknown: {
    message: "Something went wrong",
    code: "unknown",
    suggestion: "Please try again. If the problem persists, check that the repo is accessible.",
  },
};

export function toUserFriendlyError(code?: ErrorCode | string): UserFriendlyError {
  const c = (code as ErrorCode) ?? "unknown";
  return ERROR_MAP[c] ?? ERROR_MAP.unknown;
}
