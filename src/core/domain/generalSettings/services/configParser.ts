import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "@/core/domain/services/configValidator";
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

function parseOptionalString(
  obj: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const value = obj[fieldName];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `${fieldName} must be a string`,
    );
  }
  return value;
}

function parseFirstMonthOfFiscalYear(
  obj: Record<string, unknown>,
): number | undefined {
  const value = obj.firstMonthOfFiscalYear;
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number") {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "firstMonthOfFiscalYear must be a number",
    );
  }
  if (value < 1 || value > 12 || !Number.isInteger(value)) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `firstMonthOfFiscalYear must be an integer between 1 and 12, got: ${value}`,
    );
  }
  return value;
}

export const GeneralSettingsConfigParser = {
  parse: (parsed: unknown): GeneralSettingsConfig => {
    const obj = validateParsedConfig(
      parsed,
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "General settings",
    );

    const name = parseOptionalString(obj, "name");
    const description = parseOptionalString(obj, "description");

    const icon =
      obj.icon !== undefined && obj.icon !== null
        ? parseIcon(obj.icon)
        : undefined;

    const theme =
      obj.theme !== undefined && obj.theme !== null
        ? parseEnum<ThemeType>(
            obj.theme,
            VALID_THEMES,
            GeneralSettingsErrorCode.GsInvalidTheme,
            `theme must be WHITE, RED, GREEN, BLUE, YELLOW, BLACK, CLIPBOARD, BINDER, PENCIL, or CLIPS, got: ${String(obj.theme)}`,
          )
        : undefined;

    const titleField =
      obj.titleField !== undefined && obj.titleField !== null
        ? parseTitleField(obj.titleField)
        : undefined;

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

    const numberPrecision =
      obj.numberPrecision !== undefined && obj.numberPrecision !== null
        ? parseNumberPrecision(obj.numberPrecision)
        : undefined;

    const firstMonthOfFiscalYear = parseFirstMonthOfFiscalYear(obj);

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
