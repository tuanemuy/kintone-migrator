/**
 * Narrows `unknown` to `Record<string, unknown>`.
 * Returns true when the value is a non-null object (and not an array).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
