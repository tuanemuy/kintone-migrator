/**
 * Type guard utilities for safe runtime type narrowing.
 * Use these functions instead of `as` casts when working with `unknown` values.
 */

/**
 * Narrows `unknown` to `Record<string, unknown>`.
 * Returns true when the value is a non-null object (and not an array).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Narrows `unknown` to `Record<string, string>`.
 * Returns true when the value is a non-null, non-array object
 * whose every own enumerable property value is a string.
 */
export function isStringRecord(
  value: unknown,
): value is Record<string, string> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((v) => typeof v === "string");
}

/**
 * Narrows `unknown` to `{ code: string }`.
 */
export function hasCode(value: unknown): value is { code: string } {
  return isRecord(value) && typeof value.code === "string";
}

/**
 * Narrows an array element to `{ code: string }[]`.
 * Returns true when every element of the array satisfies `hasCode`.
 */
export function isCodeArray(
  value: readonly unknown[],
): value is readonly { code: string }[] {
  return value.every(hasCode);
}

/**
 * Narrows `unknown` to `{ value: Record<string, { value: unknown }> }`.
 * Used when processing kintone subtable rows.
 */
export function isKintoneSubtableRow(
  value: unknown,
): value is { value: Record<string, { value: unknown }> } {
  if (!isRecord(value)) return false;
  if (!isRecord(value.value)) return false;
  return Object.values(value.value).every(
    (cell) => isRecord(cell) && "value" in cell,
  );
}

/**
 * Narrows `unknown` to `{ type?: string }`.
 */
export function hasOptionalType(
  value: unknown,
): value is { type?: string } {
  if (!isRecord(value)) return false;
  return value.type === undefined || typeof value.type === "string";
}
