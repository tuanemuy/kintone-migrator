import { realpathSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Returns `true` if {@link targetPath} resolves to a location within
 * {@link baseDir}. Follows symlinks via `realpathSync` for both the base
 * directory and the target path when they exist on disk, falling back to
 * textual `resolve` otherwise (e.g. in tests with virtual paths or when
 * the target does not yet exist).
 *
 * {@link targetPath} may be either a relative path (resolved against
 * {@link baseDir}) or an absolute path (used as-is by `path.resolve`).
 * When callers have already resolved the path via `path.resolve(baseDir, x)`,
 * passing the result as an absolute path is safe — `resolve(base, absPath)`
 * returns `absPath` unchanged.
 *
 * **Limitation — symlinks**: If the target path does not exist on disk,
 * symlink components within it cannot be resolved. The check falls back
 * to a textual prefix comparison, which still catches `..` traversal but
 * cannot detect symlink-based escapes for non-existent paths.
 *
 * **Limitation — TOCTOU**: This check is inherently subject to a
 * time-of-check-to-time-of-use race: the filesystem may change between
 * this call and the subsequent file operation. This is acceptable for a
 * CLI tool where the user controls the local environment.
 *
 * **Note**: This function performs synchronous I/O (`realpathSync`).
 *
 * Callers decide how to handle the result.
 */
export function isSafePath(targetPath: string, baseDir: string): boolean {
  // Reject null bytes which can cause path truncation at the OS level.
  if (targetPath.includes("\0") || baseDir.includes("\0")) return false;

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
