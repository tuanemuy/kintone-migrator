/**
 * Whether `name` is an environment variable the CLI reads from `process.env`.
 * Covers the naming rules (`KINTONE_*`, `*_FILE_PATH`) so that variables added
 * under those rules are covered without listing them here.
 */
export function isCliEnvVar(name: string): boolean {
  return (
    name.startsWith("KINTONE_") ||
    name.endsWith("_FILE_PATH") ||
    name === "VERBOSE"
  );
}

/**
 * Deletes the CLI's environment variables from `env`, leaving the others.
 * Deleted directly rather than via `vi.stubEnv`, because `vi.unstubAllEnvs()`
 * would restore the deleted values.
 */
export function removeCliEnvVars(env: NodeJS.ProcessEnv): void {
  for (const name of Object.keys(env)) {
    if (isCliEnvVar(name)) {
      delete env[name];
    }
  }
}
