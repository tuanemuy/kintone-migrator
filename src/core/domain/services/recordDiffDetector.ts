type RecordDiffCallbacks<V, E> = {
  onAdded: (key: string, local: V) => E;
  onModified: (key: string, local: V, remote: V) => E | undefined;
  onDeleted: (key: string, remote: V) => E;
};

export function detectRecordDiff<V, E>(
  localRecord: Readonly<Record<string, V>>,
  remoteRecord: Readonly<Record<string, V>>,
  callbacks: RecordDiffCallbacks<V, E>,
): E[] {
  const entries: E[] = [];

  for (const [key, localValue] of Object.entries(localRecord)) {
    const remoteValue = remoteRecord[key];
    if (remoteValue === undefined) {
      entries.push(callbacks.onAdded(key, localValue));
    } else {
      const entry = callbacks.onModified(key, localValue, remoteValue);
      if (entry !== undefined) {
        entries.push(entry);
      }
    }
  }

  for (const [key, remoteValue] of Object.entries(remoteRecord)) {
    if (localRecord[key] === undefined) {
      entries.push(callbacks.onDeleted(key, remoteValue));
    }
  }

  return entries;
}
