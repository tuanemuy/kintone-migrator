import { groupByKey } from "./groupByKey";

/**
 * A local/remote pair produced by {@link pairByKeyInOrder}. `index` is the
 * 0-based position of the item among the items sharing its key.
 */
export type KeyedPair<T> =
  | Readonly<{ kind: "both"; key: string; index: number; local: T; remote: T }>
  | Readonly<{ kind: "localOnly"; key: string; index: number; local: T }>
  | Readonly<{ kind: "remoteOnly"; key: string; index: number; remote: T }>;

/**
 * Pairs local and remote items by key. Items sharing a key are matched by
 * their order of appearance, so the n-th local item with a key pairs with the
 * n-th remote item with that key.
 *
 * Pairs are returned grouped by key: keys in local first-appearance order,
 * then remote-only keys in remote first-appearance order.
 */
export function pairByKeyInOrder<T>(
  local: readonly T[],
  remote: readonly T[],
  keyFn: (item: T) => string,
): KeyedPair<T>[] {
  const localGroups = groupByKey(local, keyFn);
  const remoteGroups = groupByKey(remote, keyFn);
  const pairs: KeyedPair<T>[] = [];

  for (const [key, localItems] of localGroups) {
    const remoteItems = remoteGroups.get(key) ?? [];
    const length = Math.max(localItems.length, remoteItems.length);
    for (let index = 0; index < length; index++) {
      if (index >= remoteItems.length) {
        pairs.push({ kind: "localOnly", key, index, local: localItems[index] });
      } else if (index >= localItems.length) {
        pairs.push({
          kind: "remoteOnly",
          key,
          index,
          remote: remoteItems[index],
        });
      } else {
        pairs.push({
          kind: "both",
          key,
          index,
          local: localItems[index],
          remote: remoteItems[index],
        });
      }
    }
  }

  for (const [key, remoteItems] of remoteGroups) {
    if (localGroups.has(key)) continue;
    remoteItems.forEach((remoteItem, index) => {
      pairs.push({ kind: "remoteOnly", key, index, remote: remoteItem });
    });
  }

  return pairs;
}
