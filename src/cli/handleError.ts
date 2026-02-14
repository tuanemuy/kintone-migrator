import * as p from "@clack/prompts";
import {
  type ApplicationError,
  isSystemError,
  isValidationError,
} from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";

export function handleCliError(error: unknown): never {
  if (isBusinessRuleError(error)) {
    p.log.error(`[BusinessRuleError] ${error.code}: ${error.message}`);
    logErrorDetails(error);
    p.outro("Failed.");
    process.exit(1);
  }

  if (isValidationError(error)) {
    p.log.error(`[ValidationError] ${error.message}`);
    logErrorDetails(error);
    p.outro("Failed.");
    process.exit(1);
  }

  if (isSystemError(error)) {
    p.log.error(`[SystemError] ${error.code}: ${error.message}`);
    logErrorDetails(error);
    p.outro("Failed.");
    process.exit(1);
  }

  if (isApplicationError(error)) {
    p.log.error(`[${error.name}] ${error.code}: ${error.message}`);
    logErrorDetails(error);
    p.outro("Failed.");
    process.exit(1);
  }

  if (error instanceof Error) {
    p.log.error(`[Error] ${error.message}`);
    logErrorDetails(error);
    p.outro("Failed.");
    process.exit(1);
  }

  p.log.error(`[Error] 予期しないエラーが発生しました: ${String(error)}`);
  p.outro("Failed.");
  process.exit(1);
}

function formatErrorForDisplay(error: unknown): string {
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
    const cause = error.cause as Record<string, unknown>;
    if (Array.isArray(cause.errors)) {
      for (const e of cause.errors) {
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
    } else if (cause.errors && typeof cause.errors === "object") {
      p.log.warn(`Details: ${JSON.stringify(cause.errors, null, 2)}`);
    }
  }
  if (error.stack) {
    p.log.warn(`Stack: ${error.stack}`);
  }
}

function isApplicationError(error: unknown): error is ApplicationError {
  return (
    error instanceof Error &&
    "code" in error &&
    error.name !== "BusinessRuleError"
  );
}
