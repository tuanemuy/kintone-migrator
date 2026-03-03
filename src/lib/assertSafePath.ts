import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";

/**
 * Returns `true` if {@link targetPath} resolves to a location within
 * {@link baseDir}. Follows symlinks via `realpathSync` for both the base
 * directory and the target path when they exist on disk, falling back to
 * textual `resolve` otherwise (e.g. in tests with virtual paths or when
 * the target does not yet exist).
 *
 * **Limitation**: If the target path does not exist on disk, symlink
 * components within it cannot be resolved. The check falls back to a
 * textual prefix comparison, which still catches `..` traversal but
 * cannot detect symlink-based escapes for non-existent paths.
 *
 * This is a pure predicate with no side effects — callers decide how
 * to handle the result.
 */
export function isSafePath(targetPath: string, baseDir: string): boolean {
  // Reject null bytes which can cause path truncation at the OS level.
  if (targetPath.includes("\0")) return false;

  let resolvedBase: string;
  try {
    resolvedBase = realpathSync(baseDir);
  } catch {
    // baseDir may not exist yet (e.g. first-time dump). Fall back to
    // textual resolution which still catches `..` traversal.
    resolvedBase = resolve(baseDir);
  }

  const textualTarget = resolve(resolvedBase, targetPath);

  // When the resolved path already exists on disk, follow symlinks to
  // detect symlink-based directory escapes.
  let resolvedTarget: string;
  try {
    resolvedTarget = realpathSync(textualTarget);
  } catch {
    // Target does not exist yet — fall back to textual resolution.
    resolvedTarget = textualTarget;
  }

  return (
    resolvedTarget.startsWith(`${resolvedBase}/`) ||
    resolvedTarget === resolvedBase
  );
}

/**
 * Asserts that {@link targetPath} resolves to a location within
 * {@link baseDir}. Throws a {@link ValidationError} if the resolved
 * path escapes the allowed directory (e.g. via `..` segments or symlinks).
 *
 * **Architecture note**: This function intentionally depends on
 * {@link ValidationError} from the application layer for convenience —
 * callers in the adapter layer can use it directly without mapping.
 * {@link isSafePath} is a pure predicate with no such dependency.
 */
export function assertSafePath(targetPath: string, baseDir: string): void {
  if (!isSafePath(targetPath, baseDir)) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `Path traversal detected: "${targetPath}" escapes base directory "${baseDir}"`,
    );
  }
}
