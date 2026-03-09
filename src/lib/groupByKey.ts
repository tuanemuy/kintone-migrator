/**
 * Groups items by a key function into a Map where each key maps to an array of items.
 * Multiple items can share the same key, producing a multimap structure.
 */
export function groupByKey<T, K extends PropertyKey = string>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}
