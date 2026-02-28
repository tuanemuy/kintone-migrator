import { isRecord } from "./typeGuards";

function isArrayEqual(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqual(a[i], b[i])) return false;
  }
  return true;
}

function isRecordEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Deep equality comparison for plain JSON-like data (primitives, plain objects, arrays).
 * Does NOT support Date, RegExp, Map, Set, or other special object types —
 * they are compared by enumerable own properties, which may produce incorrect results.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) return isArrayEqual(a, b);
  if (a instanceof Date || a instanceof RegExp) {
    return String(a) === String(b);
  }
  if (a instanceof Map || a instanceof Set) {
    return false;
  }
  if (isRecord(a) && isRecord(b)) {
    return isRecordEqual(a, b);
  }
  return false;
}
