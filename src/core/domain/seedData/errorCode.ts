export const SeedDataErrorCode = {
  SdEmptyUpsertKey: "SD_EMPTY_UPSERT_KEY",
  SdEmptySeedText: "SD_EMPTY_SEED_TEXT",
  SdInvalidSeedYaml: "SD_INVALID_SEED_YAML",
  SdInvalidSeedStructure: "SD_INVALID_SEED_STRUCTURE",
  SdDuplicateKeyValue: "SD_DUPLICATE_KEY_VALUE",
  SdMissingKeyField: "SD_MISSING_KEY_FIELD",
  SdInvalidKeyFieldValue: "SD_INVALID_KEY_FIELD_VALUE",
} as const;

export type SeedDataErrorCode =
  (typeof SeedDataErrorCode)[keyof typeof SeedDataErrorCode];
