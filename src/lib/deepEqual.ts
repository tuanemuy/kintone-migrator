import { isRecord } from "./typeGuards";

function isArrayEqual(
  a: unknown[],
  b: unknown,
  seen: WeakSet<object>,
): boolean {
  if (!Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqualInner(a[i], b[i], seen)) return false;
  }
  return true;
}

function isRecordEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  seen: WeakSet<object>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!deepEqualInner(a[key], b[key], seen)) return false;
  }
  return true;
}

function isMapEqual(
  a: ReadonlyMap<unknown, unknown>,
  b: unknown,
  seen: WeakSet<object>,
): boolean {
  if (!(b instanceof Map)) return false;
  if (a.size !== b.size) return false;
  for (const [key, valA] of a) {
    if (!b.has(key)) return false;
    if (!deepEqualInner(valA, b.get(key), seen)) return false;
  }
  return true;
}

function isSetEqual(
  a: ReadonlySet<unknown>,
  b: unknown,
  seen: WeakSet<object>,
): boolean {
  if (!(b instanceof Set)) return false;
  if (a.size !== b.size) return false;
  const arrA = [...a];
  const arrB = [...b];
  for (let i = 0; i < arrA.length; i++) {
    if (!deepEqualInner(arrA[i], arrB[i], seen)) return false;
  }
  return true;
}

function deepEqualInner(
  a: unknown,
  b: unknown,
  seen: WeakSet<object>,
): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  const objA = a as object;
  const objB = b as object;

  if (seen.has(objA) || seen.has(objB)) return false;
  seen.add(objA);
  seen.add(objB);

  if (Array.isArray(objA)) return isArrayEqual(objA, objB, seen);
  if (objA instanceof Date && objB instanceof Date)
    return objA.getTime() === objB.getTime();
  if (objA instanceof Date || objB instanceof Date) return false;
  if (objA instanceof RegExp && objB instanceof RegExp)
    return String(objA) === String(objB);
  if (objA instanceof RegExp || objB instanceof RegExp) return false;
  if (objA instanceof Map) return isMapEqual(objA, objB, seen);
  if (objB instanceof Map) return false;
  if (objA instanceof Set) return isSetEqual(objA, objB, seen);
  if (objB instanceof Set) return false;

  if (isRecord(objA) && isRecord(objB)) return isRecordEqual(objA, objB, seen);
  return false;
}

/**
 * Deep equality comparison for structured data.
 * Supports primitives, plain objects, arrays, Date, RegExp, Map, and Set.
 * Has circular reference protection via a WeakSet-based seen check (tracks both sides).
 *
 * Note: `{ a: undefined }` and `{}` are NOT considered equal. This differs from
 * JSON.stringify behavior but is intentional — explicit undefined properties are
 * semantically distinct from absent properties.
 *
 * Set comparison is order-sensitive (compares elements by position after spreading),
 * with deep equality for each element.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return deepEqualInner(a, b, new WeakSet());
}
