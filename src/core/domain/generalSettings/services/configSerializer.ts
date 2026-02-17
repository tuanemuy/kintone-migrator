import { stringify as stringifyYaml } from "yaml";
import type { GeneralSettingsConfig } from "../entity";

function serializeConfig(
  config: GeneralSettingsConfig,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (config.name !== undefined) {
    result.name = config.name;
  }

  if (config.description !== undefined) {
    result.description = config.description;
  }

  if (config.icon !== undefined) {
    result.icon = {
      type: config.icon.type,
      key: config.icon.key,
    };
  }

  if (config.theme !== undefined) {
    result.theme = config.theme;
  }

  if (config.titleField !== undefined) {
    const titleField: Record<string, unknown> = {
      selectionMode: config.titleField.selectionMode,
    };
    if (config.titleField.code !== undefined) {
      titleField.code = config.titleField.code;
    }
    result.titleField = titleField;
  }

  if (config.enableThumbnails !== undefined) {
    result.enableThumbnails = config.enableThumbnails;
  }

  if (config.enableBulkDeletion !== undefined) {
    result.enableBulkDeletion = config.enableBulkDeletion;
  }

  if (config.enableComments !== undefined) {
    result.enableComments = config.enableComments;
  }

  if (config.enableDuplicateRecord !== undefined) {
    result.enableDuplicateRecord = config.enableDuplicateRecord;
  }

  if (config.enableInlineRecordEditing !== undefined) {
    result.enableInlineRecordEditing = config.enableInlineRecordEditing;
  }

  if (config.numberPrecision !== undefined) {
    result.numberPrecision = {
      digits: config.numberPrecision.digits,
      decimalPlaces: config.numberPrecision.decimalPlaces,
      roundingMode: config.numberPrecision.roundingMode,
    };
  }

  if (config.firstMonthOfFiscalYear !== undefined) {
    result.firstMonthOfFiscalYear = config.firstMonthOfFiscalYear;
  }

  return result;
}

export const GeneralSettingsConfigSerializer = {
  serialize: (config: GeneralSettingsConfig): string => {
    const serialized = serializeConfig(config);

    return stringifyYaml(serialized, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
