import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
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
    return value.map((row) => {
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        normalized[k] = v === null || v === undefined ? "" : String(v);
      }
      return normalized;
    }) as readonly Record<string, string>[];
  }
  return String(value);
}

function parseRecord(raw: unknown, index: number): SeedRecord {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new BusinessRuleError(
      SeedDataErrorCode.InvalidSeedStructure,
      `Record at index ${index} must be an object`,
    );
  }

  const record: Record<string, RecordFieldValue> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    record[key] = normalizeValue(value);
  }
  return record as SeedRecord;
}

export const SeedParser = {
  parse: (rawText: string): SeedData => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        SeedDataErrorCode.EmptySeedText,
        "Seed text cannot be empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch {
      throw new BusinessRuleError(
        SeedDataErrorCode.InvalidSeedYaml,
        "Seed text is not valid YAML",
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        SeedDataErrorCode.InvalidSeedStructure,
        "Seed data must be an object",
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (!("key" in obj) || typeof obj.key !== "string") {
      throw new BusinessRuleError(
        SeedDataErrorCode.InvalidSeedStructure,
        'Seed data must have a "key" string field',
      );
    }

    const key = UpsertKey.create(obj.key);

    if (!("records" in obj) || !Array.isArray(obj.records)) {
      throw new BusinessRuleError(
        SeedDataErrorCode.InvalidSeedStructure,
        'Seed data must have a "records" array',
      );
    }

    const records: SeedRecord[] = [];
    const seenKeys = new Set<string>();

    for (let i = 0; i < obj.records.length; i++) {
      const record = parseRecord(obj.records[i], i);

      if (!((key as string) in record)) {
        throw new BusinessRuleError(
          SeedDataErrorCode.MissingKeyField,
          `Record at index ${i} is missing key field "${key}"`,
        );
      }

      const keyValue = record[key as string];
      if (typeof keyValue !== "string") {
        throw new BusinessRuleError(
          SeedDataErrorCode.InvalidSeedStructure,
          `Key field "${key}" value at index ${i} must be a string`,
        );
      }

      if (seenKeys.has(keyValue)) {
        throw new BusinessRuleError(
          SeedDataErrorCode.DuplicateKeyValue,
          `Duplicate key value "${keyValue}" at index ${i}`,
        );
      }
      seenKeys.add(keyValue);

      records.push(record);
    }

    return { key, records };
  },
};
