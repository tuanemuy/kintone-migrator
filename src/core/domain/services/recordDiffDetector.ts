export type RecordDiffCallbacks<V, E extends NonNullable<unknown>> = {
  onAdded: (key: string, local: V) => E;
  onModified: (key: string, local: V, remote: V) => E | undefined;
  onDeleted: (key: string, remote: V) => E;
};

export function detectRecordDiff<V, E extends NonNullable<unknown>>(
  localRecord: Readonly<Record<string, V>>,
  remoteRecord: Readonly<Record<string, V>>,
  callbacks: RecordDiffCallbacks<V, E>,
): E[] {
  const entries: E[] = [];

  for (const [key, localValue] of Object.entries(localRecord)) {
    if (!Object.hasOwn(remoteRecord, key)) {
      entries.push(callbacks.onAdded(key, localValue));
    } else {
      const entry = callbacks.onModified(key, localValue, remoteRecord[key]);
      if (entry !== undefined) {
        entries.push(entry);
      }
    }
  }

  for (const [key, remoteValue] of Object.entries(remoteRecord)) {
    if (!Object.hasOwn(localRecord, key)) {
      entries.push(callbacks.onDeleted(key, remoteValue));
    }
  }

  return entries;
}
