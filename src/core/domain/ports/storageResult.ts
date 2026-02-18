export type StorageResult =
  | { exists: true; content: string }
  | { exists: false };
