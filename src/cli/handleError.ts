import * as p from "@clack/prompts";
import {
  type ApplicationError,
  isSystemError,
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
    p.log.error(`[ValidationError] ${error.message}`);
    logErrorDetails(error);
    return;
  }

  if (isSystemError(error)) {
    p.log.error(`[SystemError] ${error.code}: ${error.message}`);
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

  p.log.error(`[Error] 予期しないエラーが発生しました: ${String(error)}`);
}

export function handleCliError(error: unknown): never {
  logError(error);
  p.outro("Failed.");
  process.exit(1);
}

function logErrorDetails(error: Error): void {
  if (error.cause) {
    p.log.warn(`Cause: ${String(error.cause)}`);
    const cause = error.cause as Record<string, unknown>;
    if (cause.errors) {
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
