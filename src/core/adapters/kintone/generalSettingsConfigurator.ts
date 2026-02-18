import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";
import type {
  IconConfig,
  IconType,
  NumberPrecisionConfig,
  RoundingMode,
  ThemeType,
  TitleFieldConfig,
  TitleFieldSelectionMode,
} from "@/core/domain/generalSettings/valueObject";

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

type KintoneIconResponse =
  | { type: "PRESET"; key: string }
  | {
      type: "FILE";
      file: {
        contentType: string;
        fileKey: string;
        name: string;
        size: string;
      };
    };

type KintoneGeneralSettings = {
  name: string;
  description: string;
  icon: KintoneIconResponse;
  theme: string;
  titleField: {
    selectionMode: string;
    code: string;
  };
  enableThumbnails: boolean;
  enableBulkDeletion: boolean;
  enableComments: boolean;
  enableDuplicateRecord: boolean;
  enableInlineRecordEditing: boolean;
  numberPrecision: {
    digits: string;
    decimalPlaces: string;
    roundingMode: string;
  };
  firstMonthOfFiscalYear: string;
  revision: string;
};

function fromKintoneIcon(raw: KintoneIconResponse): IconConfig {
  if (!VALID_ICON_TYPES.has(raw.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected icon type from kintone API: ${raw.type}`,
    );
  }

  if (raw.type === "PRESET") {
    return { type: raw.type as IconType, key: raw.key };
  }

  return { type: raw.type as IconType, key: raw.file.fileKey };
}

function fromKintoneTitleField(raw: {
  selectionMode: string;
  code: string;
}): TitleFieldConfig {
  if (!VALID_SELECTION_MODES.has(raw.selectionMode)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected selectionMode from kintone API: ${raw.selectionMode}`,
    );
  }

  const result: TitleFieldConfig = {
    selectionMode: raw.selectionMode as TitleFieldSelectionMode,
  };

  if (raw.code !== undefined && raw.code.length > 0) {
    return { ...result, code: raw.code };
  }

  return result;
}

function fromKintoneNumberPrecision(raw: {
  digits: string;
  decimalPlaces: string;
  roundingMode: string;
}): NumberPrecisionConfig {
  if (!VALID_ROUNDING_MODES.has(raw.roundingMode)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected roundingMode from kintone API: ${raw.roundingMode}`,
    );
  }
  return {
    digits: Number(raw.digits),
    decimalPlaces: Number(raw.decimalPlaces),
    roundingMode: raw.roundingMode as RoundingMode,
  };
}

function fromKintoneSettings(
  raw: KintoneGeneralSettings,
): GeneralSettingsConfig {
  if (raw.theme !== undefined && !VALID_THEMES.has(raw.theme)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected theme from kintone API: ${raw.theme}`,
    );
  }

  const config: GeneralSettingsConfig = {
    ...(raw.name !== undefined ? { name: raw.name } : {}),
    ...(raw.description !== undefined ? { description: raw.description } : {}),
    ...(raw.icon !== undefined ? { icon: fromKintoneIcon(raw.icon) } : {}),
    ...(raw.theme !== undefined ? { theme: raw.theme as ThemeType } : {}),
    ...(raw.titleField !== undefined
      ? { titleField: fromKintoneTitleField(raw.titleField) }
      : {}),
    ...(raw.enableThumbnails !== undefined
      ? { enableThumbnails: raw.enableThumbnails }
      : {}),
    ...(raw.enableBulkDeletion !== undefined
      ? { enableBulkDeletion: raw.enableBulkDeletion }
      : {}),
    ...(raw.enableComments !== undefined
      ? { enableComments: raw.enableComments }
      : {}),
    ...(raw.enableDuplicateRecord !== undefined
      ? { enableDuplicateRecord: raw.enableDuplicateRecord }
      : {}),
    ...(raw.enableInlineRecordEditing !== undefined
      ? { enableInlineRecordEditing: raw.enableInlineRecordEditing }
      : {}),
    ...(raw.numberPrecision !== undefined
      ? { numberPrecision: fromKintoneNumberPrecision(raw.numberPrecision) }
      : {}),
    ...(raw.firstMonthOfFiscalYear !== undefined
      ? { firstMonthOfFiscalYear: Number(raw.firstMonthOfFiscalYear) }
      : {}),
  };

  return config;
}

function toKintoneIcon(icon: IconConfig): Record<string, unknown> {
  if (icon.type === "FILE") {
    return {
      type: "FILE",
      file: { fileKey: icon.key },
    };
  }
  return {
    type: "PRESET",
    key: icon.key,
  };
}

function toKintoneSettings(
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
    result.icon = toKintoneIcon(config.icon);
  }

  if (config.theme !== undefined) {
    result.theme = config.theme;
  }

  if (config.titleField !== undefined) {
    if (config.titleField.selectionMode === "MANUAL") {
      result.titleField = {
        selectionMode: "MANUAL",
        code: config.titleField.code,
      };
    } else {
      result.titleField = {
        selectionMode: "AUTO",
      };
    }
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

export class KintoneGeneralSettingsConfigurator
  implements GeneralSettingsConfigurator
{
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getGeneralSettings(): Promise<{
    config: GeneralSettingsConfig;
    revision: string;
  }> {
    try {
      const response = await this.client.app.getAppSettings({
        app: this.appId,
        preview: true,
      });

      // Double cast is required because the SDK's return type for getAppSettings()
      // does not include all fields present in the actual API response (e.g. numberPrecision,
      // firstMonthOfFiscalYear). We cast through `unknown` to our local KintoneGeneralSettings
      // type which accurately reflects the runtime data.
      const raw = response as unknown as KintoneGeneralSettings;
      const config = fromKintoneSettings(raw);

      return {
        config,
        revision: raw.revision ?? "-1",
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get general settings",
        error,
      );
    }
  }

  async updateGeneralSettings(params: {
    config: GeneralSettingsConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const requestParams: Record<string, unknown> = {
        app: this.appId,
        ...toKintoneSettings(params.config),
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateAppSettings(
        requestParams as Parameters<
          typeof this.client.app.updateAppSettings
        >[0],
      );

      return { revision: response.revision };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update general settings",
        error,
      );
    }
  }
}
