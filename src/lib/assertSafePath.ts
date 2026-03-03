import { resolve } from "node:path";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";

/**
 * Validates that {@link targetPath} resolves to a location within
 * {@link baseDir}. Throws a {@link ValidationError} if the resolved
 * path escapes the allowed directory (e.g. via `..` segments).
 */
export function assertSafePath(targetPath: string, baseDir: string): void {
  const resolvedBase = resolve(baseDir);
  const resolvedTarget = resolve(baseDir, targetPath);

  if (
    !resolvedTarget.startsWith(`${resolvedBase}/`) &&
    resolvedTarget !== resolvedBase
  ) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `Path traversal detected: "${targetPath}" escapes base directory "${baseDir}"`,
    );
  }
}
