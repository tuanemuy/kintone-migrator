import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
import type { SeedData } from "../entity";
import { SeedDataErrorCode } from "../errorCode";
import type { RecordFieldValue, SeedRecord } from "../valueObject";
import { UpsertKey } from "../valueObject";

function normalizeValue(value: unknown): RecordFieldValue {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [] as readonly string[];
    }
    const first = value[0];
    if (typeof first === "string") {
      return value as readonly string[];
    }
    if (typeof first === "number") {
      return value.map(String) as readonly string[];
    }
    if (
      typeof first === "object" &&
      first !== null &&
      "code" in first &&
      Object.keys(first).length === 1
    ) {
      return value as readonly { code: string }[];
    }
    // Subtable rows
    return value.filter(isRecord).map((row) => {
      const normalized: Record<string, string | readonly string[]> = {};
      for (const [k, v] of Object.entries(row)) {
        if (Array.isArray(v)) {
          normalized[k] = v.map(String) as readonly string[];
        } else {
          normalized[k] = v === null || v === undefined ? "" : String(v);
        }
      }
      return normalized;
    }) as readonly Record<string, string | readonly string[]>[];
  }
  return String(value);
}

function parseRecord(raw: unknown, index: number): SeedRecord {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      SeedDataErrorCode.SdInvalidSeedStructure,
      `Record at index ${index} must be an object`,
    );
  }

  const record: Record<string, RecordFieldValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    record[key] = normalizeValue(value);
  }
  return record as SeedRecord;
}

export const SeedParser = {
  parse: (rawText: string): SeedData => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        SeedDataErrorCode.SdEmptySeedText,
        "Seed text cannot be empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch {
      throw new BusinessRuleError(
        SeedDataErrorCode.SdInvalidSeedYaml,
        "Seed text is not valid YAML",
      );
    }

    if (!isRecord(parsed)) {
      throw new BusinessRuleError(
        SeedDataErrorCode.SdInvalidSeedStructure,
        "Seed data must be an object",
      );
    }

    const obj = parsed;

    const key =
      "key" in obj && typeof obj.key === "string"
        ? UpsertKey.create(obj.key)
        : null;

    if (!("records" in obj) || !Array.isArray(obj.records)) {
      throw new BusinessRuleError(
        SeedDataErrorCode.SdInvalidSeedStructure,
        'Seed data must have a "records" array',
      );
    }

    const records: SeedRecord[] = [];
    const seenKeys = new Set<string>();

    for (let i = 0; i < obj.records.length; i++) {
      const record = parseRecord(obj.records[i], i);

      if (key !== null) {
        if (!((key as string) in record)) {
          throw new BusinessRuleError(
            SeedDataErrorCode.SdMissingKeyField,
            `Record at index ${i} is missing key field "${key}"`,
          );
        }

        const keyValue = record[key as string];
        if (typeof keyValue !== "string") {
          throw new BusinessRuleError(
            SeedDataErrorCode.SdInvalidSeedStructure,
            `Key field "${key}" value at index ${i} must be a string`,
          );
        }

        if (seenKeys.has(keyValue)) {
          throw new BusinessRuleError(
            SeedDataErrorCode.SdDuplicateKeyValue,
            `Duplicate key value "${keyValue}" at index ${i}`,
          );
        }
        seenKeys.add(keyValue);
      }

      records.push(record);
    }

    return { key, records };
  },
};
