import { BusinessRuleError } from "@/core/domain/error";
import { SeedDataErrorCode } from "./errorCode";

// UpsertKey
export type UpsertKey = string & { readonly brand: "UpsertKey" };

export const UpsertKey = {
  create: (key: string): UpsertKey => {
    if (key.length === 0) {
      throw new BusinessRuleError(
        SeedDataErrorCode.EmptyUpsertKey,
        "Upsert key cannot be empty",
      );
    }
    return key as UpsertKey;
  },
};

// UserEntity
export type UserEntity = Readonly<{
  code: string;
}>;

// SubtableRow
export type SubtableRow = Readonly<Record<string, string>>;

// RecordFieldValue
export type RecordFieldValue =
  | string
  | readonly string[]
  | readonly UserEntity[]
  | readonly SubtableRow[];

// SeedRecord
export type SeedRecord = Readonly<Record<string, RecordFieldValue>>;
