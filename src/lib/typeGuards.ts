/**
 * Narrows `unknown` to a plain `Record<string, unknown>`.
 * Returns true when the value is a non-null, non-array plain object.
 * Excludes built-in types (Date, RegExp, Map, Set) that are technically
 * objects but should not be treated as string-keyed records.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp) &&
    !(value instanceof Map) &&
    !(value instanceof Set)
  );
}
