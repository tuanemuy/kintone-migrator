export const SeedDataErrorCode = {
  EmptyUpsertKey: "EMPTY_UPSERT_KEY",
  EmptySeedText: "EMPTY_SEED_TEXT",
  InvalidSeedYaml: "INVALID_SEED_YAML",
  InvalidSeedStructure: "INVALID_SEED_STRUCTURE",
  DuplicateKeyValue: "DUPLICATE_KEY_VALUE",
  MissingKeyField: "MISSING_KEY_FIELD",
  InvalidKeyFieldValue: "INVALID_KEY_FIELD_VALUE",
} as const;

export type SeedDataErrorCode =
  (typeof SeedDataErrorCode)[keyof typeof SeedDataErrorCode];
