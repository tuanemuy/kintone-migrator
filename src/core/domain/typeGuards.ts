/**
 * Type guard utilities for safe runtime type narrowing.
 * Use these functions instead of `as` casts when working with `unknown` values.
 */

import type { BusinessRuleErrorCode } from "@/core/domain/error";
import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/lib/typeGuards";

export { isRecord };

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
export function hasOptionalType(value: unknown): value is { type?: string } {
  if (!isRecord(value)) return false;
  return value.type === undefined || typeof value.type === "string";
}

/**
 * Strict boolean validation — rejects non-boolean values.
 * Returns the boolean value if valid, or `defaultValue` when the value is undefined/null.
 * Throws `BusinessRuleError` when the value is present but not a boolean.
 */
export function parseStrictBoolean(
  value: unknown,
  fieldName: string,
  context: string,
  errorCode: BusinessRuleErrorCode,
  defaultValue?: boolean,
): boolean {
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) return defaultValue;
    throw new BusinessRuleError(
      errorCode,
      `${context} must have a boolean "${fieldName}" property`,
    );
  }
  if (typeof value !== "boolean") {
    throw new BusinessRuleError(
      errorCode,
      `${context} has invalid "${fieldName}" value: ${String(value)}. Must be a boolean`,
    );
  }
  return value;
}

/**
 * Validates that a string value is within an allowed set and returns a typed value.
 * Replaces `if (!SET.has(x)) throw; ... x as T` patterns.
 */
export function parseEnum<T extends string>(
  value: string,
  validValues: ReadonlySet<string>,
  errorCode: BusinessRuleErrorCode,
  message: string,
): T {
  if (!validValues.has(value)) {
    throw new BusinessRuleError(errorCode, message);
  }
  return value as T;
}
