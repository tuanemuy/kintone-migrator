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
 * Compare two objects by own enumerable string keys (via `Object.keys`).
 *
 * Note: Custom class instances (e.g. `new Error()`) that pass `isRecord` are
 * accepted. Because `Error.prototype.message` is non-enumerable, two Error
 * objects with different messages will compare as equal. Callers should not
 * rely on this function for types with non-enumerable significant state.
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

/**
 * Map keys are compared by reference (SameValueZero), not by deep equality.
 * Two Maps with structurally equal but referentially different object keys
 * will be considered unequal.
 */
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

// Returns true when every element is a primitive (not object or function).
// Primitive-only sets can use Set.has (SameValueZero) for O(n) comparison
// instead of the O(n²) deep-equality fallback. Functions are excluded
// because they are reference types that require identity comparison, not
// structural comparison.
// NaN is typeof "number" so it is treated as primitive here; Set.has uses
// SameValueZero which correctly treats NaN as equal to NaN.
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
  // Failed match attempts may push entries onto the stack; we save the
  // current length and truncate on failure so that only the successful
  // match path's entries persist.
  const remaining = [...b];
  for (const valA of a) {
    const stackLen = stack.length;
    const idx = remaining.findIndex((valB) => {
      const result = deepEqualInner(valA, valB, stack);
      if (!result) stack.length = stackLen;
      return result;
    });
    if (idx === -1) return false;
    remaining.splice(idx, 1);
  }
  return true;
}

function compareDateOrRegExp(objA: object, objB: object): boolean | undefined {
  if (objA instanceof Date && objB instanceof Date) {
    const ta = objA.getTime();
    const tb = objB.getTime();
    return ta === tb || (Number.isNaN(ta) && Number.isNaN(tb));
  }
  if (objA instanceof Date || objB instanceof Date) return false;
  if (objA instanceof RegExp && objB instanceof RegExp)
    return String(objA) === String(objB);
  if (objA instanceof RegExp || objB instanceof RegExp) return false;
  return undefined;
}

function compareCollectionOrRecord(
  objA: object,
  objB: object,
  stack: SeenStack,
): boolean {
  if (Array.isArray(objA)) {
    return isArrayEqual(objA, objB, stack);
  }
  if (objA instanceof Map) {
    return isMapEqual(objA, objB, stack);
  }
  if (objB instanceof Map) {
    return false;
  }
  if (objA instanceof Set) {
    return isSetEqual(objA, objB, stack);
  }
  if (objB instanceof Set) {
    return false;
  }
  if (isRecord(objA)) {
    return isRecordEqual(objA, objB, stack);
  }
  return false;
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
  const dateRegExpResult = compareDateOrRegExp(objA, objB);
  if (dateRegExpResult !== undefined) return dateRegExpResult;

  // Circular reference detection (bisimilarity / observational equivalence):
  // If the exact pair (objA, objB) is already on the comparison stack, we
  // are in a cycle. We assume structural equality to break the cycle —
  // this is correct because the ancestor frame that first pushed this pair
  // will still check every remaining property exhaustively.
  //
  // The check is direction-sensitive: (a, b) and (b, a) are distinct pairs.
  // For mutual cross-references (a.ref = b, b.ref = a), the path becomes
  // (a,b) → (b,a) → (a,b) [cycle hit]. The intermediate (b,a) frame still
  // compares all of b's properties against a's, so differences are caught.
  for (const [sa, sb] of stack) {
    if (sa === objA && sb === objB) return true;
  }

  stack.push([objA, objB]);

  try {
    return compareCollectionOrRecord(objA, objB, stack);
  } finally {
    stack.pop();
  }
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
 * Map keys are compared by reference (SameValueZero), not by deep equality.
 * Two Maps with structurally equal but referentially different object keys
 * will be considered unequal.
 *
 * NaN handling: `deepEqual(NaN, NaN)` returns `true`. Invalid Date objects
 * (whose `getTime()` returns NaN) are also considered equal to each other.
 *
 * Signed zero: `-0` and `0` are considered equal (`-0 === 0` is `true`).
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
