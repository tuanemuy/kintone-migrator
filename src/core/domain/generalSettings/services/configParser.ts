import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
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

const VALID_THEMES: ReadonlySet<string> = new Set([
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

const VALID_ICON_TYPES: ReadonlySet<string> = new Set(["PRESET", "FILE"]);

const VALID_SELECTION_MODES: ReadonlySet<string> = new Set(["AUTO", "MANUAL"]);

const VALID_ROUNDING_MODES: ReadonlySet<string> = new Set([
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

  if (typeof raw.type !== "string" || !VALID_ICON_TYPES.has(raw.type)) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidIconType,
      `icon.type must be PRESET or FILE, got: ${String(raw.type)}`,
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
      `icon.type must be PRESET or FILE, got: ${raw.type}`,
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

  if (
    typeof raw.selectionMode !== "string" ||
    !VALID_SELECTION_MODES.has(raw.selectionMode)
  ) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `titleField.selectionMode must be AUTO or MANUAL, got: ${String(raw.selectionMode)}`,
    );
  }

  const result: TitleFieldConfig = {
    selectionMode: parseEnum<TitleFieldSelectionMode>(
      raw.selectionMode,
      VALID_SELECTION_MODES,
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `titleField.selectionMode must be AUTO or MANUAL, got: ${raw.selectionMode}`,
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

  if (
    typeof raw.roundingMode !== "string" ||
    !VALID_ROUNDING_MODES.has(raw.roundingMode)
  ) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `numberPrecision.roundingMode must be HALF_EVEN, UP, or DOWN, got: ${String(raw.roundingMode)}`,
    );
  }

  return {
    digits: raw.digits,
    decimalPlaces: raw.decimalPlaces,
    roundingMode: parseEnum<RoundingMode>(
      raw.roundingMode,
      VALID_ROUNDING_MODES,
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `numberPrecision.roundingMode must be HALF_EVEN, UP, or DOWN, got: ${raw.roundingMode}`,
    ),
  };
}

export const GeneralSettingsConfigParser = {
  parse: (rawText: string): GeneralSettingsConfig => {
    const parsed = parseYamlConfig(
      rawText,
      {
        emptyConfigText: GeneralSettingsErrorCode.GsEmptyConfigText,
        invalidConfigYaml: GeneralSettingsErrorCode.GsInvalidConfigYaml,
        invalidConfigStructure:
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
      },
      "General settings",
    );

    let name: string | undefined;
    if (parsed.name !== undefined && parsed.name !== null) {
      if (typeof parsed.name !== "string") {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
          "name must be a string",
        );
      }
      name = parsed.name;
    }

    let description: string | undefined;
    if (parsed.description !== undefined && parsed.description !== null) {
      if (typeof parsed.description !== "string") {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
          "description must be a string",
        );
      }
      description = parsed.description;
    }

    let icon: IconConfig | undefined;
    if (parsed.icon !== undefined && parsed.icon !== null) {
      icon = parseIcon(parsed.icon);
    }

    let theme: ThemeType | undefined;
    if (parsed.theme !== undefined && parsed.theme !== null) {
      if (typeof parsed.theme !== "string" || !VALID_THEMES.has(parsed.theme)) {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidTheme,
          `theme must be WHITE, RED, GREEN, BLUE, YELLOW, BLACK, CLIPBOARD, BINDER, PENCIL, or CLIPS, got: ${String(parsed.theme)}`,
        );
      }
      theme = parseEnum<ThemeType>(
        parsed.theme,
        VALID_THEMES,
        GeneralSettingsErrorCode.GsInvalidTheme,
        `theme must be WHITE, RED, GREEN, BLUE, YELLOW, BLACK, CLIPBOARD, BINDER, PENCIL, or CLIPS, got: ${parsed.theme}`,
      );
    }

    let titleField: TitleFieldConfig | undefined;
    if (parsed.titleField !== undefined && parsed.titleField !== null) {
      titleField = parseTitleField(parsed.titleField);
    }

    let enableThumbnails: boolean | undefined;
    if (
      parsed.enableThumbnails !== undefined &&
      parsed.enableThumbnails !== null
    ) {
      enableThumbnails = parseStrictBoolean(
        parsed.enableThumbnails,
        "enableThumbnails",
        "Config",
        GeneralSettingsErrorCode.GsInvalidBooleanField,
      );
    }

    let enableBulkDeletion: boolean | undefined;
    if (
      parsed.enableBulkDeletion !== undefined &&
      parsed.enableBulkDeletion !== null
    ) {
      enableBulkDeletion = parseStrictBoolean(
        parsed.enableBulkDeletion,
        "enableBulkDeletion",
        "Config",
        GeneralSettingsErrorCode.GsInvalidBooleanField,
      );
    }

    let enableComments: boolean | undefined;
    if (parsed.enableComments !== undefined && parsed.enableComments !== null) {
      enableComments = parseStrictBoolean(
        parsed.enableComments,
        "enableComments",
        "Config",
        GeneralSettingsErrorCode.GsInvalidBooleanField,
      );
    }

    let enableDuplicateRecord: boolean | undefined;
    if (
      parsed.enableDuplicateRecord !== undefined &&
      parsed.enableDuplicateRecord !== null
    ) {
      enableDuplicateRecord = parseStrictBoolean(
        parsed.enableDuplicateRecord,
        "enableDuplicateRecord",
        "Config",
        GeneralSettingsErrorCode.GsInvalidBooleanField,
      );
    }

    let enableInlineRecordEditing: boolean | undefined;
    if (
      parsed.enableInlineRecordEditing !== undefined &&
      parsed.enableInlineRecordEditing !== null
    ) {
      enableInlineRecordEditing = parseStrictBoolean(
        parsed.enableInlineRecordEditing,
        "enableInlineRecordEditing",
        "Config",
        GeneralSettingsErrorCode.GsInvalidBooleanField,
      );
    }

    let numberPrecision: NumberPrecisionConfig | undefined;
    if (
      parsed.numberPrecision !== undefined &&
      parsed.numberPrecision !== null
    ) {
      numberPrecision = parseNumberPrecision(parsed.numberPrecision);
    }

    let firstMonthOfFiscalYear: number | undefined;
    if (
      parsed.firstMonthOfFiscalYear !== undefined &&
      parsed.firstMonthOfFiscalYear !== null
    ) {
      if (typeof parsed.firstMonthOfFiscalYear !== "number") {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
          "firstMonthOfFiscalYear must be a number",
        );
      }
      if (
        parsed.firstMonthOfFiscalYear < 1 ||
        parsed.firstMonthOfFiscalYear > 12 ||
        !Number.isInteger(parsed.firstMonthOfFiscalYear)
      ) {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidConfigStructure,
          `firstMonthOfFiscalYear must be an integer between 1 and 12, got: ${parsed.firstMonthOfFiscalYear}`,
        );
      }
      firstMonthOfFiscalYear = parsed.firstMonthOfFiscalYear;
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
