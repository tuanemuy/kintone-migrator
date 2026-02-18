import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
import type { SeedRecordWithId, UpsertPlan } from "../entity";
import { SeedDataErrorCode } from "../errorCode";
import type { KintoneRecordForResponse } from "../ports/recordManager";
import type { RecordFieldValue, SeedRecord, UpsertKey } from "../valueObject";
import { RecordConverter } from "./recordConverter";

function deepEqual(a: RecordFieldValue, b: RecordFieldValue): boolean {
  if (typeof a === "string" && typeof b === "string") {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const itemA = a[i];
      const itemB = b[i];

      if (typeof itemA === "string" && typeof itemB === "string") {
        if (itemA !== itemB) return false;
        continue;
      }

      if (isRecord(itemA) && isRecord(itemB)) {
        const keysA = Object.keys(itemA);
        const keysB = Object.keys(itemB);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
          if (String(itemA[key] ?? "") !== String(itemB[key] ?? ""))
            return false;
        }
        continue;
      }

      if (String(itemA) !== String(itemB)) return false;
    }
    return true;
  }

  return String(a) === String(b);
}

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
    existingRecords: readonly KintoneRecordForResponse[],
  ): UpsertPlan => {
    const keyField = key as string;

    // Build lookup map: keyValue → { id, record }
    const existingMap = new Map<string, { id: string; record: SeedRecord }>();
    for (const kintoneRecord of existingRecords) {
      const id = kintoneRecord.$id.value;
      const converted = RecordConverter.fromKintoneRecord(kintoneRecord);
      const keyValue = converted[keyField];
      if (typeof keyValue === "string") {
        existingMap.set(keyValue, { id, record: converted });
      }
    }

    const toAdd: SeedRecord[] = [];
    const toUpdate: SeedRecordWithId[] = [];
    let unchanged = 0;

    for (const seedRecord of seedRecords) {
      const keyValue = seedRecord[keyField];
      if (typeof keyValue !== "string") {
        throw new BusinessRuleError(
          SeedDataErrorCode.InvalidKeyFieldValue,
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
