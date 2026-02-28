import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import type { GeneralSettingsConfig } from "../entity";
import type { GeneralSettingsDiffEntry } from "../valueObject";

// Default values match the kintone API defaults:
// - string fields: "" (empty string)
// - boolean fields: false
// - firstMonthOfFiscalYear: 1 (January)
// - object fields (icon, titleField, numberPrecision): null
type FieldSpec =
  | { kind: "string"; field: keyof GeneralSettingsConfig; defaultValue: string }
  | {
      kind: "boolean";
      field: keyof GeneralSettingsConfig;
      defaultValue: boolean;
    }
  | { kind: "number"; field: keyof GeneralSettingsConfig; defaultValue: number }
  | { kind: "deepEqual"; field: keyof GeneralSettingsConfig };

const FIELD_SPECS: readonly FieldSpec[] = [
  { kind: "string", field: "name", defaultValue: "" },
  { kind: "string", field: "description", defaultValue: "" },
  { kind: "deepEqual", field: "icon" },
  { kind: "string", field: "theme", defaultValue: "" },
  { kind: "deepEqual", field: "titleField" },
  { kind: "boolean", field: "enableThumbnails", defaultValue: false },
  { kind: "boolean", field: "enableBulkDeletion", defaultValue: false },
  { kind: "boolean", field: "enableComments", defaultValue: false },
  { kind: "boolean", field: "enableDuplicateRecord", defaultValue: false },
  { kind: "boolean", field: "enableInlineRecordEditing", defaultValue: false },
  { kind: "deepEqual", field: "numberPrecision" },
  { kind: "number", field: "firstMonthOfFiscalYear", defaultValue: 1 },
];

function compareConfigs(
  local: GeneralSettingsConfig,
  remote: GeneralSettingsConfig,
): GeneralSettingsDiffEntry[] {
  const entries: GeneralSettingsDiffEntry[] = [];

  for (const spec of FIELD_SPECS) {
    const { field } = spec;
    switch (spec.kind) {
      case "string": {
        const l = (local[field] as string | undefined) ?? spec.defaultValue;
        const r = (remote[field] as string | undefined) ?? spec.defaultValue;
        if (l !== r) {
          entries.push({
            type: "modified",
            field,
            details:
              field === "description"
                ? "description changed"
                : `"${r}" -> "${l}"`,
          });
        }
        break;
      }
      case "boolean": {
        const l = (local[field] as boolean | undefined) ?? spec.defaultValue;
        const r = (remote[field] as boolean | undefined) ?? spec.defaultValue;
        if (l !== r) {
          entries.push({
            type: "modified",
            field,
            details: `${String(r)} -> ${String(l)}`,
          });
        }
        break;
      }
      case "number": {
        const l = (local[field] as number | undefined) ?? spec.defaultValue;
        const r = (remote[field] as number | undefined) ?? spec.defaultValue;
        if (l !== r) {
          entries.push({
            type: "modified",
            field,
            details: `${r} -> ${l}`,
          });
        }
        break;
      }
      case "deepEqual": {
        if (!deepEqual(local[field] ?? null, remote[field] ?? null)) {
          entries.push({
            type: "modified",
            field,
            details: `${field} changed`,
          });
        }
        break;
      }
    }
  }

  return entries;
}

export const GeneralSettingsDiffDetector = {
  detect: (local: GeneralSettingsConfig, remote: GeneralSettingsConfig) => {
    const entries = compareConfigs(local, remote);
    return buildDiffResult(entries);
  },
};
