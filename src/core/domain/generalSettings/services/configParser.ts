import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
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
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      'icon must be an object with "type" and "key" properties',
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== "string" || !VALID_ICON_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidIconType,
      `icon.type must be PRESET or FILE, got: ${String(obj.type)}`,
    );
  }

  if (typeof obj.key !== "string" || obj.key.length === 0) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      'icon must have a non-empty "key" property',
    );
  }

  return { type: obj.type as IconType, key: obj.key };
}

function parseTitleField(raw: unknown): TitleFieldConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      'titleField must be an object with "selectionMode" property',
    );
  }

  const obj = raw as Record<string, unknown>;

  if (
    typeof obj.selectionMode !== "string" ||
    !VALID_SELECTION_MODES.has(obj.selectionMode)
  ) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `titleField.selectionMode must be AUTO or MANUAL, got: ${String(obj.selectionMode)}`,
    );
  }

  const result: TitleFieldConfig = {
    selectionMode: obj.selectionMode as TitleFieldSelectionMode,
  };

  if (obj.code !== undefined && obj.code !== null) {
    if (typeof obj.code !== "string") {
      throw new BusinessRuleError(
        GeneralSettingsErrorCode.GsInvalidConfigStructure,
        "titleField.code must be a string",
      );
    }
    return { ...result, code: obj.code };
  }

  return result;
}

function parseNumberPrecision(raw: unknown): NumberPrecisionConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "numberPrecision must be an object",
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.digits !== "number") {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "numberPrecision.digits must be a number",
    );
  }

  if (typeof obj.decimalPlaces !== "number") {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      "numberPrecision.decimalPlaces must be a number",
    );
  }

  if (
    typeof obj.roundingMode !== "string" ||
    !VALID_ROUNDING_MODES.has(obj.roundingMode)
  ) {
    throw new BusinessRuleError(
      GeneralSettingsErrorCode.GsInvalidConfigStructure,
      `numberPrecision.roundingMode must be HALF_EVEN, UP, or DOWN, got: ${String(obj.roundingMode)}`,
    );
  }

  return {
    digits: obj.digits,
    decimalPlaces: obj.decimalPlaces,
    roundingMode: obj.roundingMode as RoundingMode,
  };
}

export const GeneralSettingsConfigParser = {
  parse: (rawText: string): GeneralSettingsConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        GeneralSettingsErrorCode.GsEmptyConfigText,
        "General settings config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        GeneralSettingsErrorCode.GsInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        GeneralSettingsErrorCode.GsInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed as Record<string, unknown>;

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
      if (typeof obj.theme !== "string" || !VALID_THEMES.has(obj.theme)) {
        throw new BusinessRuleError(
          GeneralSettingsErrorCode.GsInvalidTheme,
          `theme must be WHITE, RED, GREEN, BLUE, YELLOW, BLACK, CLIPBOARD, BINDER, PENCIL, or CLIPS, got: ${String(obj.theme)}`,
        );
      }
      theme = obj.theme as ThemeType;
    }

    let titleField: TitleFieldConfig | undefined;
    if (obj.titleField !== undefined && obj.titleField !== null) {
      titleField = parseTitleField(obj.titleField);
    }

    let enableThumbnails: boolean | undefined;
    if (obj.enableThumbnails !== undefined && obj.enableThumbnails !== null) {
      enableThumbnails = Boolean(obj.enableThumbnails);
    }

    let enableBulkDeletion: boolean | undefined;
    if (
      obj.enableBulkDeletion !== undefined &&
      obj.enableBulkDeletion !== null
    ) {
      enableBulkDeletion = Boolean(obj.enableBulkDeletion);
    }

    let enableComments: boolean | undefined;
    if (obj.enableComments !== undefined && obj.enableComments !== null) {
      enableComments = Boolean(obj.enableComments);
    }

    let enableDuplicateRecord: boolean | undefined;
    if (
      obj.enableDuplicateRecord !== undefined &&
      obj.enableDuplicateRecord !== null
    ) {
      enableDuplicateRecord = Boolean(obj.enableDuplicateRecord);
    }

    let enableInlineRecordEditing: boolean | undefined;
    if (
      obj.enableInlineRecordEditing !== undefined &&
      obj.enableInlineRecordEditing !== null
    ) {
      enableInlineRecordEditing = Boolean(obj.enableInlineRecordEditing);
    }

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
