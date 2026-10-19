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
