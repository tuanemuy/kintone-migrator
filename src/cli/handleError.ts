import * as p from "@clack/prompts";
import {
  ApplicationError,
  isConflictError,
  isForbiddenError,
  isNotFoundError,
  isSystemError,
  isUnauthenticatedError,
  isValidationError,
} from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";

export function logError(error: unknown): void {
  if (isBusinessRuleError(error)) {
    p.log.error(`[BusinessRuleError] ${error.code}: ${error.message}`);
    logErrorDetails(error);
    return;
  }

  if (isValidationError(error)) {
    p.log.error(`[ValidationError] ${error.code}: ${error.message}`);
    logErrorDetails(error);
    return;
  }

  if (isSystemError(error)) {
    p.log.error(`[SystemError] ${error.code}: ${error.message}`);
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

export function handleCliError(error: unknown): never {
  logError(error);
  p.outro("Failed.");
  process.exit(1);
}

export function formatErrorForDisplay(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error, null, 2);
  }
  return String(error);
}

function logErrorDetails(error: Error): void {
  if (error.cause) {
    p.log.warn(`Cause: ${formatErrorForDisplay(error.cause)}`);
    logNestedErrorProperties(error.cause);
  }
  if (error.stack) {
    p.log.warn(`Stack: ${error.stack}`);
  }
}

function logNestedErrorProperties(target: unknown): void {
  if (typeof target !== "object" || target === null) {
    return;
  }

  const record = target as Record<string, unknown>;

  // Handle `.error` (singular) property - e.g. KintoneAllRecordsError wraps KintoneRestAPIError
  if (record.error instanceof Error) {
    p.log.warn(`  Error: ${record.error.message}`);
    const innerRecord = record.error as unknown as Record<string, unknown>;
    if (innerRecord.errors && typeof innerRecord.errors === "object") {
      p.log.warn(`  Details: ${JSON.stringify(innerRecord.errors, null, 2)}`);
    }
  }

  // Handle `.errors` (plural) array - e.g. array of Error objects
  if (Array.isArray(record.errors)) {
    for (const e of record.errors) {
      if (e instanceof Error) {
        p.log.warn(`  - ${e.message}`);
        const inner = e as unknown as Record<string, unknown>;
        if (inner.errors && typeof inner.errors === "object") {
          p.log.warn(`    ${JSON.stringify(inner.errors, null, 2)}`);
        }
      } else {
        p.log.warn(`  - ${JSON.stringify(e, null, 2)}`);
      }
    }
  } else if (
    record.errors &&
    typeof record.errors === "object" &&
    !("error" in record)
  ) {
    // Handle `.errors` (plural) object - e.g. KintoneRestAPIError field-level details
    // Skip if `.error` was already handled above to avoid duplicate output
    p.log.warn(`Details: ${JSON.stringify(record.errors, null, 2)}`);
  }

  // Recursively follow the cause chain
  if (target instanceof Error && target.cause) {
    p.log.warn(`  Caused by: ${formatErrorForDisplay(target.cause)}`);
    logNestedErrorProperties(target.cause);
  }
}

function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}
