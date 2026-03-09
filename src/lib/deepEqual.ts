import { isRecord } from "./typeGuards";

type SeenStack = [object, object][];

function isArrayEqual(a: unknown[], b: unknown, stack: SeenStack): boolean {
  if (!Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqualInner(a[i], b[i], stack)) return false;
  }
  return true;
}

/**
 * Compare two plain objects by own enumerable string keys.
 * Only supports plain objects (no class instances with inherited enumerable properties).
 */
function isRecordEqual(
  a: Record<string, unknown>,
  b: unknown,
  stack: SeenStack,
): boolean {
  if (!isRecord(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!deepEqualInner(a[key], b[key], stack)) return false;
  }
  return true;
}

function isMapEqual(
  a: ReadonlyMap<unknown, unknown>,
  b: unknown,
  stack: SeenStack,
): boolean {
  if (!(b instanceof Map)) return false;
  if (a.size !== b.size) return false;
  for (const [key, valA] of a) {
    if (!b.has(key)) return false;
    if (!deepEqualInner(valA, b.get(key), stack)) return false;
  }
  return true;
}

function isPrimitiveSet(s: ReadonlySet<unknown>): boolean {
  for (const val of s) {
    if (val !== null && typeof val === "object") return false;
    if (typeof val === "function") return false;
  }
  return true;
}

function isSetEqual(
  a: ReadonlySet<unknown>,
  b: unknown,
  stack: SeenStack,
): boolean {
  if (!(b instanceof Set)) return false;
  if (a.size !== b.size) return false;
  // Fast path: primitive-only sets can use Set.has for O(n) comparison.
  // Set.has uses SameValueZero which correctly handles NaN.
  if (isPrimitiveSet(a) && isPrimitiveSet(b)) {
    for (const val of a) {
      if (!b.has(val)) return false;
    }
    return true;
  }
  // Order-independent comparison: for each element in a, find a matching
  // element in b using deep equality. O(n²) but sets are typically small.
  // Each element comparison uses a cloned stack to prevent failed match
  // attempts from polluting the circular reference tracker, while still
  // preserving circular reference protection from the parent context.
  const remaining = [...b];
  for (const valA of a) {
    const idx = remaining.findIndex((valB) =>
      deepEqualInner(valA, valB, [...stack]),
    );
    if (idx === -1) return false;
    remaining.splice(idx, 1);
  }
  return true;
}

function deepEqualInner(a: unknown, b: unknown, stack: SeenStack): boolean {
  if (a === b) return true;
  if (
    typeof a === "number" &&
    typeof b === "number" &&
    Number.isNaN(a) &&
    Number.isNaN(b)
  )
    return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  const objA = a as object;
  const objB = b as object;

  // Date and RegExp are compared by value and don't recurse,
  // so they don't need circular reference tracking.
  if (objA instanceof Date && objB instanceof Date)
    return objA.getTime() === objB.getTime();
  if (objA instanceof Date || objB instanceof Date) return false;
  if (objA instanceof RegExp && objB instanceof RegExp)
    return String(objA) === String(objB);
  if (objA instanceof RegExp || objB instanceof RegExp) return false;

  // Circular reference detection: if this (objA, objB) pair is already
  // on the comparison stack, we're in a cycle. Assume structural equality
  // to break the cycle.
  for (const [sa, sb] of stack) {
    if (sa === objA && sb === objB) return true;
  }

  stack.push([objA, objB]);

  let result: boolean;
  if (Array.isArray(objA)) {
    result = isArrayEqual(objA, objB, stack);
  } else if (objA instanceof Map) {
    result = isMapEqual(objA, objB, stack);
  } else if (objB instanceof Map) {
    result = false;
  } else if (objA instanceof Set) {
    result = isSetEqual(objA, objB, stack);
  } else if (objB instanceof Set) {
    result = false;
  } else if (isRecord(objA)) {
    result = isRecordEqual(objA, objB, stack);
  } else {
    result = false;
  }

  stack.pop();
  return result;
}

/**
 * Deep equality comparison for structured data.
 * Supports primitives, plain objects, arrays, Date, RegExp, Map, and Set.
 *
 * Note: `{ a: undefined }` and `{}` are NOT considered equal. This differs from
 * JSON.stringify behavior but is intentional — explicit undefined properties are
 * semantically distinct from absent properties.
 *
 * Set comparison is order-independent: each element in one set is matched to an
 * element in the other using deep equality (O(n²) for non-primitive elements,
 * O(n) fast path for primitive-only sets).
 *
 * NaN handling: `deepEqual(NaN, NaN)` returns `true`.
 *
 * Circular reference handling: uses a stack-based pair tracker. When the same
 * `(objA, objB)` pair is encountered again on the current comparison path,
 * structural equality is assumed to break the cycle. Shared references (DAG
 * structures) are correctly handled — the same sub-object appearing in multiple
 * properties does not cause false negatives.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return deepEqualInner(a, b, []);
}
