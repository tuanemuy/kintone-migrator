import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import type { GeneralSettingsConfig } from "../entity";
import type {
  GeneralSettingsDiff,
  GeneralSettingsDiffEntry,
} from "../valueObject";

// kintone API defaults for optional fields
const DEFAULT_STRING = "";
const DEFAULT_BOOLEAN = false;
const DEFAULT_FIRST_MONTH = 1; // January

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
    suppressValues = false,
  ): void {
    const lv = l ?? defaultValue;
    const rv = r ?? defaultValue;
    if (lv !== rv) {
      entries.push({
        type: "modified",
        field,
        details: suppressValues ? `${field} changed` : `"${rv}" -> "${lv}"`,
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
    if (!deepEqual(l, r)) {
      entries.push({
        type: "modified",
        field,
        details: `${field} changed`,
      });
    }
  }

  compareString("name", local.name, remote.name, DEFAULT_STRING);
  compareString(
    "description",
    local.description,
    remote.description,
    DEFAULT_STRING,
    true,
  );
  compareDeepEqual("icon", local.icon, remote.icon);
  compareString("theme", local.theme, remote.theme, DEFAULT_STRING);
  compareDeepEqual("titleField", local.titleField, remote.titleField);
  compareBoolean(
    "enableThumbnails",
    local.enableThumbnails,
    remote.enableThumbnails,
    DEFAULT_BOOLEAN,
  );
  compareBoolean(
    "enableBulkDeletion",
    local.enableBulkDeletion,
    remote.enableBulkDeletion,
    DEFAULT_BOOLEAN,
  );
  compareBoolean(
    "enableComments",
    local.enableComments,
    remote.enableComments,
    DEFAULT_BOOLEAN,
  );
  compareBoolean(
    "enableDuplicateRecord",
    local.enableDuplicateRecord,
    remote.enableDuplicateRecord,
    DEFAULT_BOOLEAN,
  );
  compareBoolean(
    "enableInlineRecordEditing",
    local.enableInlineRecordEditing,
    remote.enableInlineRecordEditing,
    DEFAULT_BOOLEAN,
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
    DEFAULT_FIRST_MONTH,
  );

  return entries;
}

export const GeneralSettingsDiffDetector = {
  detect: (
    local: GeneralSettingsConfig,
    remote: GeneralSettingsConfig,
  ): GeneralSettingsDiff => {
    const entries = compareConfigs(local, remote);
    return buildDiffResult(entries);
  },
};
