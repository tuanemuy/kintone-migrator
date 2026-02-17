import type {
  IconConfig,
  NumberPrecisionConfig,
  ThemeType,
  TitleFieldConfig,
} from "./valueObject";

export type GeneralSettingsConfig = Readonly<{
  name?: string;
  description?: string;
  icon?: IconConfig;
  theme?: ThemeType;
  titleField?: TitleFieldConfig;
  enableThumbnails?: boolean;
  enableBulkDeletion?: boolean;
  enableComments?: boolean;
  enableDuplicateRecord?: boolean;
  enableInlineRecordEditing?: boolean;
  numberPrecision?: NumberPrecisionConfig;
  firstMonthOfFiscalYear?: number;
}>;
