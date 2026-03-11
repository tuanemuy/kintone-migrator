import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "@/core/domain/services/yamlConfigParser";
import {
  isRecord,
  parseEnum,
  parseStrictBoolean,
} from "@/core/domain/typeGuards";
import type { GeneralSettingsConfig } from "../entity";
import { GeneralSettingsErrorCode } from "../errorCode";
import type {
  IconConfig,
  IconType,
  NumberPrecisionConfig,
  RoundingMode,
  ThemeType,
  TitleFieldConfig,
  TitleFieldSelectionMode,
} from "../valueObject";

function parseOptionalBoolean(
  parsed: Record<string, unknown>,
  fieldName: string,
): boolean | undefined {
  const value = parsed[fieldName];
  if (value === undefined || value === null) return undefined;
  return parseStrictBoolean(
    value,
    fieldName,
    "Config",
    GeneralSettingsErrorCode.GsInvalidBooleanField,
  );
}

const VALID_THEMES: ReadonlySet<ThemeType> = new Set<ThemeType>([
  "WHITE",
  "RED",
  "GREEN",
  "BLUE",
  "YELLOW",
  "BLACK",
  "CLIPBOARD",
  "BINDER",
  "PENCIL",
  "CLIPS",
]);

const VALID_ICON_TYPES: ReadonlySet<IconType> = new Set<IconType>([
  "PRESET",
  "FILE",
]);

const VALID_SELECTION_MODES: ReadonlySet<TitleFieldSelectionMode> =
  new Set<TitleFieldSelectionMode>(["AUTO", "MANUAL"]);

const VALID_ROUNDING_MODES: ReadonlySet<RoundingMode> = new Set<RoundingMode>([
  "HALF_EVEN",
  "UP",
  "DOWN",
]);

function parseIcon(raw: unknown): IconConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      'icon must be an object with "type" and "key" properties',
    );
  }

  if (typeof raw.key !== "string" || raw.key.length === 0) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      'icon must have a non-empty "key" property',
    );
  }

  return {
    type: parseEnum<IconType>(
      raw.type,
      VALID_ICON_TYPES,
      GeneralSettingsErrorCode.GsInvalidIconType,
      `icon.type must be PRESET or FILE, got: ${String(raw.type)}`,
    ),
    key: raw.key,
  };
}

function parseTitleField(raw: unknown): TitleFieldConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      'titleField must be an object with "selectionMode" property',
    );
  }

  const result: TitleFieldConfig = {
    selectionMode: parseEnum<TitleFieldSelectionMode>(
      raw.selectionMode,
      VALID_SELECTION_MODES,
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `titleField.selectionMode must be AUTO or MANUAL, got: ${String(raw.selectionMode)}`,
    ),
  };

  if (raw.code !== undefined && raw.code !== null) {
    if (typeof raw.code !== "string") {
      throw new BusinessRuleError(
        GeneralSettingsErrorCode.GsInvalidConfigStructure,
        "titleField.code must be a string",
      );
    }
    return { ...result, code: raw.code };
  }

  return result;
}

function parseNumberPrecision(raw: unknown): NumberPrecisionConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "numberPrecision must be an object",
    );
  }

  if (typeof raw.digits !== "number") {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "numberPrecision.digits must be a number",
    );
  }

  if (!Number.isInteger(raw.digits) || raw.digits < 0) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidNumberPrecision,
      `numberPrecision.digits must be a non-negative integer, got: ${raw.digits}`,
    );
  }

  if (typeof raw.decimalPlaces !== "number") {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "numberPrecision.decimalPlaces must be a number",
    );
  }

  if (!Number.isInteger(raw.decimalPlaces) || raw.decimalPlaces < 0) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidNumberPrecision,
      `numberPrecision.decimalPlaces must be a non-negative integer, got: ${raw.decimalPlaces}`,
    );
  }

  return {
    digits: raw.digits,
    decimalPlaces: raw.decimalPlaces,
    roundingMode: parseEnum<RoundingMode>(
      raw.roundingMode,
      VALID_ROUNDING_MODES,
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `numberPrecision.roundingMode must be HALF_EVEN, UP, or DOWN, got: ${String(raw.roundingMode)}`,
    ),
  };
}

export const GeneralSettingsConfigParser = {
  parse: (parsed: unknown): GeneralSettingsConfig => {
    const obj = validateParsedConfig(
      parsed,
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "General settings",
    );

    let name: string | undefined;
    if (obj.name !== undefined && obj.name !== null) {
      if (typeof obj.name !== "string") {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
          "name must be a string",
        );
      }
      name = obj.name;
    }

    let description: string | undefined;
    if (obj.description !== undefined && obj.description !== null) {
      if (typeof obj.description !== "string") {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
          "description must be a string",
        );
      }
      description = obj.description;
    }

    let icon: IconConfig | undefined;
    if (obj.icon !== undefined && obj.icon !== null) {
      icon = parseIcon(obj.icon);
    }

    let theme: ThemeType | undefined;
    if (obj.theme !== undefined && obj.theme !== null) {
      theme = parseEnum<ThemeType>(
        obj.theme,
        VALID_THEMES,
        GeneralSettingsErrorCode.GsInvalidTheme,
        `theme must be WHITE, RED, GREEN, BLUE, YELLOW, BLACK, CLIPBOARD, BINDER, PENCIL, or CLIPS, got: ${String(obj.theme)}`,
      );
    }

    let titleField: TitleFieldConfig | undefined;
    if (obj.titleField !== undefined && obj.titleField !== null) {
      titleField = parseTitleField(obj.titleField);
    }

    const enableThumbnails = parseOptionalBoolean(obj, "enableThumbnails");
    const enableBulkDeletion = parseOptionalBoolean(obj, "enableBulkDeletion");
    const enableComments = parseOptionalBoolean(obj, "enableComments");
    const enableDuplicateRecord = parseOptionalBoolean(
      obj,
      "enableDuplicateRecord",
    );
    const enableInlineRecordEditing = parseOptionalBoolean(
      obj,
      "enableInlineRecordEditing",
    );

    let numberPrecision: NumberPrecisionConfig | undefined;
    if (obj.numberPrecision !== undefined && obj.numberPrecision !== null) {
      numberPrecision = parseNumberPrecision(obj.numberPrecision);
    }

    let firstMonthOfFiscalYear: number | undefined;
    if (
      obj.firstMonthOfFiscalYear !== undefined &&
      obj.firstMonthOfFiscalYear !== null
    ) {
      if (typeof obj.firstMonthOfFiscalYear !== "number") {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
          "firstMonthOfFiscalYear must be a number",
        );
      }
      if (
        obj.firstMonthOfFiscalYear < 1 ||
        obj.firstMonthOfFiscalYear > 12 ||
        !Number.isInteger(obj.firstMonthOfFiscalYear)
      ) {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
          `firstMonthOfFiscalYear must be an integer between 1 and 12, got: ${obj.firstMonthOfFiscalYear}`,
        );
      }
      firstMonthOfFiscalYear = obj.firstMonthOfFiscalYear;
    }

    const config: GeneralSettingsConfig = {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(theme !== undefined ? { theme } : {}),
      ...(titleField !== undefined ? { titleField } : {}),
      ...(enableThumbnails !== undefined ? { enableThumbnails } : {}),
      ...(enableBulkDeletion !== undefined ? { enableBulkDeletion } : {}),
      ...(enableComments !== undefined ? { enableComments } : {}),
      ...(enableDuplicateRecord !== undefined ? { enableDuplicateRecord } : {}),
      ...(enableInlineRecordEditing !== undefined
        ? { enableInlineRecordEditing }
        : {}),
      ...(numberPrecision !== undefined ? { numberPrecision } : {}),
      ...(firstMonthOfFiscalYear !== undefined
        ? { firstMonthOfFiscalYear }
        : {}),
    };

    return config;
  },
};
