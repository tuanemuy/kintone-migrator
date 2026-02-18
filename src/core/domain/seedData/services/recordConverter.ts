import {
  hasCode,
  hasOptionalType,
  isKintoneSubtableRow,
} from "@/core/domain/typeGuards";
import type {
  KintoneRecordForParameter,
  KintoneRecordForResponse,
} from "../ports/recordManager";
import type { RecordFieldValue, SeedRecord, SubtableRow } from "../valueObject";

const SYSTEM_FIELDS: ReadonlySet<string> = new Set([
  "$id",
  "$revision",
  "RECORD_NUMBER",
  "CREATOR",
  "CREATED_TIME",
  "MODIFIER",
  "UPDATED_TIME",
  "STATUS",
  "STATUS_ASSIGNEE",
  "CATEGORY",
]);

const SYSTEM_FIELD_TYPES: ReadonlySet<string> = new Set([
  "RECORD_NUMBER",
  "__ID__",
  "__REVISION__",
  "CREATOR",
  "CREATED_TIME",
  "MODIFIER",
  "UPDATED_TIME",
  "STATUS",
  "STATUS_ASSIGNEE",
  "CATEGORY",
]);

function isSubtableRowArray(value: unknown): value is readonly SubtableRow[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  const first = value[0];
  return (
    typeof first === "object" &&
    first !== null &&
    !("code" in first && Object.keys(first).length === 1)
  );
}

function toKintoneFieldValue(value: RecordFieldValue): { value: unknown } {
  if (typeof value === "string") {
    return { value };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { value: [] };
    }
    const first = value[0];
    if (typeof first === "string") {
      return { value };
    }
    if (
      typeof first === "object" &&
      first !== null &&
      "code" in first &&
      !isSubtableRowArray(value)
    ) {
      return { value };
    }
    // Subtable rows — value is readonly SubtableRow[] here
    const subtableRows = value as readonly SubtableRow[];
    return {
      value: subtableRows.map((row) => {
        const kintoneRow: Record<string, { value: unknown }> = {};
        for (const [k, cellValue] of Object.entries(row)) {
          kintoneRow[k] = { value: cellValue };
        }
        return { value: kintoneRow };
      }),
    };
  }
  return { value };
}

function fromKintoneFieldValue(value: unknown): RecordFieldValue {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [] as readonly string[];
    }
    const first = value[0];
    if (typeof first === "string") {
      return value as readonly string[];
    }
    if (typeof first === "object" && first !== null) {
      // User entity: { code: string, name?: string }
      if ("code" in first && !("value" in first)) {
        return value.filter(hasCode).map((u) => ({ code: u.code }));
      }
      // Subtable row: { id: string, value: { field: { value: ... } } }
      if ("value" in first) {
        return value.filter(isKintoneSubtableRow).map((row) => {
          const cells = row.value;
          const flat: Record<string, string | readonly string[]> = {};
          for (const [k, cell] of Object.entries(cells)) {
            if (SYSTEM_FIELDS.has(k)) continue;
            if (Array.isArray(cell.value)) {
              flat[k] = cell.value.map(String) as readonly string[];
            } else {
              flat[k] =
                cell.value === null || cell.value === undefined
                  ? ""
                  : String(cell.value);
            }
          }
          return flat;
        });
      }
    }
    return value.map(String) as readonly string[];
  }
  return String(value);
}

export const RecordConverter = {
  toKintoneRecord: (record: SeedRecord): KintoneRecordForParameter => {
    const kintoneRecord: Record<string, { value: unknown }> = {};
    for (const [fieldCode, fieldValue] of Object.entries(record)) {
      if (SYSTEM_FIELDS.has(fieldCode)) continue;
      kintoneRecord[fieldCode] = toKintoneFieldValue(fieldValue);
    }
    return kintoneRecord;
  },

  fromKintoneRecord: (record: KintoneRecordForResponse): SeedRecord => {
    const seedRecord: Record<string, RecordFieldValue> = {};
    for (const [fieldCode, cell] of Object.entries(record)) {
      if (SYSTEM_FIELDS.has(fieldCode)) continue;
      const fieldType = hasOptionalType(cell) ? cell.type : undefined;
      if (fieldType !== undefined && SYSTEM_FIELD_TYPES.has(fieldType))
        continue;
      seedRecord[fieldCode] = fromKintoneFieldValue(cell.value);
    }
    return seedRecord as SeedRecord;
  },
};
