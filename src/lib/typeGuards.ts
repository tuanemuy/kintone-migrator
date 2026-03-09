/**
 * Narrows `unknown` to `Record<string, unknown>`.
 * Returns true when the value is a non-null, non-array object that is not
 * one of the explicitly excluded built-in types (Date, RegExp, Map, Set).
 *
 * Note: Custom class instances (e.g. `new Foo()`, `new Error()`) and
 * prototype-less objects (`Object.create(null)`) also pass this guard.
 * This function checks own enumerable string-keyed properties only;
 * inherited enumerable properties are not considered.
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
