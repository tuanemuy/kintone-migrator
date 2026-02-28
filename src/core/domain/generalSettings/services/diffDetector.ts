import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import type { GeneralSettingsConfig } from "../entity";
import type { GeneralSettingsDiffEntry } from "../valueObject";

// Default values match the kintone API defaults:
// - string fields: "" (empty string)
// - boolean fields: false
// - firstMonthOfFiscalYear: 1 (January)
// - object fields (icon, titleField, numberPrecision): null
function compareConfigs(
  local: GeneralSettingsConfig,
  remote: GeneralSettingsConfig,
): GeneralSettingsDiffEntry[] {
  const entries: GeneralSettingsDiffEntry[] = [];

  function compareString(
    field: string,
    l: string | undefined,
    r: string | undefined,
    defaultValue: string,
  ): void {
    const lv = l ?? defaultValue;
    const rv = r ?? defaultValue;
    if (lv !== rv) {
      entries.push({
        type: "modified",
        field,
        details:
          field === "description"
            ? "description changed"
            : `"${rv}" -> "${lv}"`,
      });
    }
  }

  function compareBoolean(
    field: string,
    l: boolean | undefined,
    r: boolean | undefined,
    defaultValue: boolean,
  ): void {
    const lv = l ?? defaultValue;
    const rv = r ?? defaultValue;
    if (lv !== rv) {
      entries.push({
        type: "modified",
        field,
        details: `${String(rv)} -> ${String(lv)}`,
      });
    }
  }

  function compareNumber(
    field: string,
    l: number | undefined,
    r: number | undefined,
    defaultValue: number,
  ): void {
    const lv = l ?? defaultValue;
    const rv = r ?? defaultValue;
    if (lv !== rv) {
      entries.push({
        type: "modified",
        field,
        details: `${rv} -> ${lv}`,
      });
    }
  }

  function compareDeepEqual(field: string, l: unknown, r: unknown): void {
    if (!deepEqual(l ?? null, r ?? null)) {
      entries.push({
        type: "modified",
        field,
        details: `${field} changed`,
      });
    }
  }

  compareString("name", local.name, remote.name, "");
  compareString("description", local.description, remote.description, "");
  compareDeepEqual("icon", local.icon, remote.icon);
  compareString("theme", local.theme, remote.theme, "");
  compareDeepEqual("titleField", local.titleField, remote.titleField);
  compareBoolean(
    "enableThumbnails",
    local.enableThumbnails,
    remote.enableThumbnails,
    false,
  );
  compareBoolean(
    "enableBulkDeletion",
    local.enableBulkDeletion,
    remote.enableBulkDeletion,
    false,
  );
  compareBoolean(
    "enableComments",
    local.enableComments,
    remote.enableComments,
    false,
  );
  compareBoolean(
    "enableDuplicateRecord",
    local.enableDuplicateRecord,
    remote.enableDuplicateRecord,
    false,
  );
  compareBoolean(
    "enableInlineRecordEditing",
    local.enableInlineRecordEditing,
    remote.enableInlineRecordEditing,
    false,
  );
  compareDeepEqual(
    "numberPrecision",
    local.numberPrecision,
    remote.numberPrecision,
  );
  compareNumber(
    "firstMonthOfFiscalYear",
    local.firstMonthOfFiscalYear,
    remote.firstMonthOfFiscalYear,
    1,
  );

  return entries;
}

export const GeneralSettingsDiffDetector = {
  detect: (local: GeneralSettingsConfig, remote: GeneralSettingsConfig) => {
    const entries = compareConfigs(local, remote);
    return buildDiffResult(entries);
  },
};
