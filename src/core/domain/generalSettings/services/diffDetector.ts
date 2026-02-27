import { buildDiffResult, deepEqual } from "../../diff";
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

  if ((local.name ?? "") !== (remote.name ?? "")) {
    entries.push({
      type: "modified",
      field: "name",
      details: `"${remote.name ?? ""}" -> "${local.name ?? ""}"`,
    });
  }

  if ((local.description ?? "") !== (remote.description ?? "")) {
    entries.push({
      type: "modified",
      field: "description",
      details: "description changed",
    });
  }

  if (!deepEqual(local.icon ?? null, remote.icon ?? null)) {
    entries.push({
      type: "modified",
      field: "icon",
      details: "icon changed",
    });
  }

  if ((local.theme ?? "") !== (remote.theme ?? "")) {
    entries.push({
      type: "modified",
      field: "theme",
      details: `${remote.theme ?? "default"} -> ${local.theme ?? "default"}`,
    });
  }

  if (!deepEqual(local.titleField ?? null, remote.titleField ?? null)) {
    entries.push({
      type: "modified",
      field: "titleField",
      details: "titleField changed",
    });
  }

  if (
    (local.enableThumbnails ?? false) !== (remote.enableThumbnails ?? false)
  ) {
    entries.push({
      type: "modified",
      field: "enableThumbnails",
      details: `${String(remote.enableThumbnails ?? false)} -> ${String(local.enableThumbnails ?? false)}`,
    });
  }

  if (
    (local.enableBulkDeletion ?? false) !== (remote.enableBulkDeletion ?? false)
  ) {
    entries.push({
      type: "modified",
      field: "enableBulkDeletion",
      details: `${String(remote.enableBulkDeletion ?? false)} -> ${String(local.enableBulkDeletion ?? false)}`,
    });
  }

  if ((local.enableComments ?? false) !== (remote.enableComments ?? false)) {
    entries.push({
      type: "modified",
      field: "enableComments",
      details: `${String(remote.enableComments ?? false)} -> ${String(local.enableComments ?? false)}`,
    });
  }

  if (
    (local.enableDuplicateRecord ?? false) !==
    (remote.enableDuplicateRecord ?? false)
  ) {
    entries.push({
      type: "modified",
      field: "enableDuplicateRecord",
      details: `${String(remote.enableDuplicateRecord ?? false)} -> ${String(local.enableDuplicateRecord ?? false)}`,
    });
  }

  if (
    (local.enableInlineRecordEditing ?? false) !==
    (remote.enableInlineRecordEditing ?? false)
  ) {
    entries.push({
      type: "modified",
      field: "enableInlineRecordEditing",
      details: `${String(remote.enableInlineRecordEditing ?? false)} -> ${String(local.enableInlineRecordEditing ?? false)}`,
    });
  }

  if (
    !deepEqual(local.numberPrecision ?? null, remote.numberPrecision ?? null)
  ) {
    entries.push({
      type: "modified",
      field: "numberPrecision",
      details: "numberPrecision changed",
    });
  }

  if (
    (local.firstMonthOfFiscalYear ?? 1) !== (remote.firstMonthOfFiscalYear ?? 1)
  ) {
    entries.push({
      type: "modified",
      field: "firstMonthOfFiscalYear",
      details: `${remote.firstMonthOfFiscalYear ?? 1} -> ${local.firstMonthOfFiscalYear ?? 1}`,
    });
  }

  return entries;
}

export const GeneralSettingsDiffDetector = {
  detect: (local: GeneralSettingsConfig, remote: GeneralSettingsConfig) => {
    const entries = compareConfigs(local, remote);
    return buildDiffResult(entries);
  },
};
