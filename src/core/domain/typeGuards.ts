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
 * Validates that an unknown value is a string within an allowed set and returns a typed value.
 * Replaces manual `typeof` + `Set.has` + `as` cast patterns.
 */
export function parseEnum<T extends string>(
  value: unknown,
  validValues: ReadonlySet<T>,
  errorCode: BusinessRuleErrorCode,
  message: string,
): T {
  if (
    typeof value !== "string" ||
    !(validValues as ReadonlySet<string>).has(value)
  ) {
    throw new BusinessRuleError(errorCode, message);
  }
  return value as T;
}

/**
 * Shared entity parsing logic for domains that use `{ type, code }` entities.
 * Handles common validation: isRecord check, type enum validation, and code non-empty check.
 * Use `allowEmptyCode` to permit empty/missing code for specific entity types (e.g., CREATOR).
 */
export function parseEntityBase<T extends string>(
  raw: unknown,
  index: number,
  validTypes: ReadonlySet<T>,
  errorCodes: {
    invalidStructure: BusinessRuleErrorCode;
    invalidType: BusinessRuleErrorCode;
    emptyCode: BusinessRuleErrorCode;
  },
  options?: {
    allowEmptyCode?: (type: T) => boolean;
  },
): { type: T; code: string } {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      errorCodes.invalidStructure,
      `Entity at index ${index} must be an object`,
    );
  }

  const type = parseEnum<T>(
    raw.type,
    validTypes,
    errorCodes.invalidType,
    `Entity at index ${index} has invalid type: ${String(raw.type)}. Must be ${[...validTypes].join(", ")}`,
  );

  if (options?.allowEmptyCode?.(type)) {
    return { type, code: typeof raw.code === "string" ? raw.code : "" };
  }

  if (typeof raw.code !== "string" || raw.code.length === 0) {
    throw new BusinessRuleError(
      errorCodes.emptyCode,
      `Entity at index ${index} must have a non-empty "code" property`,
    );
  }

  return { type, code: raw.code };
}
