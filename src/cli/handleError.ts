import * as p from "@clack/prompts";
import {
  ApplicationError,
  isConflictError,
  isForbiddenError,
  isNotFoundError,
  isSystemError,
  isUnauthenticatedError,
  isValidationError,
  type SystemErrorCode,
} from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";

/**
 * Log error details without terminating the process.
 * Use this in contexts where multiple errors may be reported (e.g. multi-app results).
 *
 * Note: This function intentionally does NOT show the "Set VERBOSE=1 ..." hint.
 * The hint is only shown by `handleCliError`, which is the top-level CLI handler.
 * `logError` is used for per-app error reporting within multi-app runs where the
 * hint would be noisy if repeated for each failure.
 */
export function logError(error: unknown): void {
  if (isBusinessRuleError(error)) {
    p.log.error(`[BusinessRuleError] ${error.code}: ${error.message}`);
    logErrorDetails(error);
    return;
  }

  if (isValidationError(error)) {
    p.log.error(`[ValidationError] ${error.code}: ${error.message}`);
    p.log.warn("Hint: Please check your input values and configuration.");
    logErrorDetails(error);
    return;
  }

  if (isSystemError(error)) {
    p.log.error(`[SystemError] ${error.code}: ${error.message}`);
    const hint = systemErrorHints[error.code];
    if (hint) {
      p.log.warn(`Hint: ${hint}`);
    }
    logErrorDetails(error);
    return;
  }

  if (isNotFoundError(error)) {
    p.log.error(`[NotFoundError] ${error.code}: ${error.message}`);
    p.log.warn(
      "Hint: The specified resource was not found. Please verify the app ID or resource identifier.",
    );
    logErrorDetails(error);
    return;
  }

  if (isConflictError(error)) {
    p.log.error(`[ConflictError] ${error.code}: ${error.message}`);
    p.log.warn(
      "Hint: A conflict was detected. Another change may have been made. Please retry the operation.",
    );
    logErrorDetails(error);
    return;
  }

  if (isUnauthenticatedError(error)) {
    p.log.error(`[UnauthenticatedError] ${error.code}: ${error.message}`);
    p.log.warn(
      "Hint: Authentication failed. Please verify your API token or username/password credentials.",
    );
    logErrorDetails(error);
    return;
  }

  if (isForbiddenError(error)) {
    p.log.error(`[ForbiddenError] ${error.code}: ${error.message}`);
    p.log.warn(
      "Hint: Insufficient permissions. Please check that your credentials have the required access rights.",
    );
    logErrorDetails(error);
    return;
  }

  if (isApplicationError(error)) {
    p.log.error(`[${error.name}] ${error.code}: ${error.message}`);
    logErrorDetails(error);
    return;
  }

  if (error instanceof Error) {
    p.log.error(`[Error] ${error.message}`);
    logErrorDetails(error);
    return;
  }

  p.log.error(`[Error] Unexpected error occurred: ${String(error)}`);
}

/**
 * Log error details and terminate the process with exit code 1.
 * Use this as the top-level error handler in CLI command `run` functions.
 */
export function handleCliError(error: unknown): never {
  logError(error);
  if (!isVerbose()) {
    p.log.info("Set VERBOSE=1 for full stack traces.");
  }
  p.outro("Failed.");
  process.exit(1);
}

export function formatErrorForDisplay(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeString(error.message);
  }
  if (typeof error === "object" && error !== null) {
    return JSON.stringify(sanitizeForDisplay(error), null, 2);
  }
  return sanitizeString(String(error));
}

const systemErrorHints: Partial<Record<SystemErrorCode, string>> = {
  NETWORK_ERROR: "Please check your network connection and kintone domain.",
  EXTERNAL_API_ERROR:
    "The kintone API returned an unexpected error. Please retry or check the API status.",
  STORAGE_ERROR:
    "Failed to read/write a local file. Please check file permissions.",
  EXECUTION_ERROR:
    "One or more apps failed during execution. Check the individual errors above.",
};

const SENSITIVE_KEYS =
  /^(authorization|apitoken|api-token|api_token|apikey|api-key|api_key|password|secret|credentials|x-cybozu-authorization)$/i;

const SENSITIVE_VALUE_PATTERNS =
  /(?<=(?:password|apiToken|api[_-]?token|api[_-]?key|secret|credentials)[=:]\s*)\S+/gi;

const AUTHORIZATION_VALUE_PATTERN = /(?<=authorization[=:]\s*)\S+(?:\s+\S+)?/gi;

function sanitizeString(value: string): string {
  // Order is safe: AUTHORIZATION_VALUE_PATTERN uses a lookbehind for "authorization"
  // and SENSITIVE_VALUE_PATTERNS uses lookbehinds for other keys (password, apiToken, etc.).
  // The two patterns target disjoint keyword sets, so replacement order does not matter.
  return value
    .replace(AUTHORIZATION_VALUE_PATTERN, "[REDACTED]")
    .replace(SENSITIVE_VALUE_PATTERNS, "[REDACTED]");
}

function sanitizeForDisplay(
  obj: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  if (seen.has(obj)) {
    return "[Circular]";
  }
  seen.add(obj);
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForDisplay(item, seen));
  }
  const result: Record<string, unknown> = {};
  // Error's `message` and `stack` are non-enumerable, so Object.entries() won't include them.
  // Extract them explicitly to ensure they are sanitized and included in the output.
  if (obj instanceof Error) {
    result.message = sanitizeString(obj.message);
    if (obj.stack) {
      result.stack = sanitizeString(obj.stack);
    }
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeForDisplay(value, seen);
    } else if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isVerbose(): boolean {
  return (
    process.env.VERBOSE === "1" ||
    process.env.VERBOSE === "true" ||
    process.env.VERBOSE === "yes"
  );
}

// Logs first-level cause and stack trace.
// logNestedErrorProperties handles deeper cause chains (2nd level and beyond).
function logErrorDetails(error: Error): void {
  if (error.cause) {
    const seen = new WeakSet<object>();
    seen.add(error);
    p.log.warn(`Cause: ${formatErrorForDisplay(error.cause)}`);
    logNestedErrorProperties(error.cause, seen);
  }
  if (isVerbose() && error.stack) {
    p.log.warn(`Stack: ${error.stack}`);
  }
}

function logNestedErrorProperties(
  target: unknown,
  seen: WeakSet<object> = new WeakSet(),
): void {
  if (typeof target !== "object" || target === null) {
    return;
  }
  if (seen.has(target)) {
    return;
  }
  seen.add(target);

  const record = target as Record<string, unknown>;

  // Handle `.error` (singular) property - e.g. KintoneAllRecordsError wraps KintoneRestAPIError
  if (record.error instanceof Error) {
    p.log.warn(`  Error: ${sanitizeString(record.error.message)}`);
    if (hasObjectProperty(record.error, "errors")) {
      p.log.warn(
        `  Details: ${JSON.stringify(sanitizeForDisplay(record.error.errors), null, 2)}`,
      );
    }
  }

  // Handle `.errors` (plural) array - e.g. array of Error objects
  if (Array.isArray(record.errors)) {
    for (const e of record.errors) {
      if (e instanceof Error) {
        p.log.warn(`  - ${sanitizeString(e.message)}`);
        if (hasObjectProperty(e, "errors")) {
          p.log.warn(
            `    ${JSON.stringify(sanitizeForDisplay(e.errors), null, 2)}`,
          );
        }
      } else {
        p.log.warn(`  - ${JSON.stringify(sanitizeForDisplay(e), null, 2)}`);
      }
    }
  } else if (
    record.errors &&
    typeof record.errors === "object" &&
    !(record.error instanceof Error)
  ) {
    // Handle `.errors` (plural) object - e.g. KintoneRestAPIError field-level details
    // Skip if `.error` was already handled above to avoid duplicate output
    p.log.warn(
      `Details: ${JSON.stringify(sanitizeForDisplay(record.errors), null, 2)}`,
    );
  }

  // Recursively follow the cause chain
  if (target instanceof Error && target.cause) {
    p.log.warn(`  Caused by: ${formatErrorForDisplay(target.cause)}`);
    logNestedErrorProperties(target.cause, seen);
  }
}

function hasObjectProperty<K extends string>(
  obj: object,
  key: K,
): obj is object & Record<K, unknown> {
  return (
    key in obj &&
    typeof (obj as Record<string, unknown>)[key] === "object" &&
    (obj as Record<string, unknown>)[key] !== null
  );
}

function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}
