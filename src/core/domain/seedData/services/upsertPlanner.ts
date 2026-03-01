import { BusinessRuleError } from "@/core/domain/error";
import { deepEqual } from "@/lib/deepEqual";
import type { SeedRecordWithId, UpsertPlan } from "../entity";
import { SeedDataErrorCode } from "../errorCode";
import type { SeedRecord, UpsertKey } from "../valueObject";

// Intentionally compares only seed-side keys: kintone-only fields are ignored
// so that seed data drives the source of truth for managed fields.
function recordsEqual(
  seed: SeedRecord,
  existing: SeedRecord,
  keyField: string,
): boolean {
  const seedKeys = Object.keys(seed).filter((k) => k !== keyField);
  for (const key of seedKeys) {
    const seedValue = seed[key];
    const existingValue = existing[key];
    if (seedValue === undefined && existingValue === undefined) continue;
    if (seedValue === undefined || existingValue === undefined) return false;
    if (!deepEqual(seedValue, existingValue)) return false;
  }
  return true;
}

export const UpsertPlanner = {
  plan: (
    key: UpsertKey,
    seedRecords: readonly SeedRecord[],
    existingRecords: readonly SeedRecordWithId[],
  ): UpsertPlan => {
    const keyField = key as string;

    // Build lookup map: keyValue → { id, record }
    const existingMap = new Map<string, { id: string; record: SeedRecord }>();
    for (const { id, record } of existingRecords) {
      const keyValue = record[keyField];
      if (typeof keyValue === "string") {
        existingMap.set(keyValue, { id, record });
      }
    }

    const toAdd: SeedRecord[] = [];
    const toUpdate: SeedRecordWithId[] = [];
    let unchanged = 0;

    for (const seedRecord of seedRecords) {
      const keyValue = seedRecord[keyField];
      if (typeof keyValue !== "string") {
        throw new BusinessRuleError(
          SeedDataErrorCode.SdInvalidKeyFieldValue,
          `Key field "${keyField}" value must be a string, got ${typeof keyValue}`,
        );
      }

      const existing = existingMap.get(keyValue);
      if (existing === undefined) {
        toAdd.push(seedRecord);
      } else if (recordsEqual(seedRecord, existing.record, keyField)) {
        unchanged++;
      } else {
        toUpdate.push({ id: existing.id, record: seedRecord });
      }
    }

    return { toAdd, toUpdate, unchanged };
  },
};
