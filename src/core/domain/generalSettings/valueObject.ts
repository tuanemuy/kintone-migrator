export type ThemeType =
  | "WHITE"
  | "RED"
  | "GREEN"
  | "BLUE"
  | "YELLOW"
  | "BLACK"
  | "CLIPBOARD"
  | "BINDER"
  | "PENCIL"
  | "CLIPS";

export type IconType = "PRESET" | "FILE";

export type IconConfig = Readonly<{
  type: IconType;
  key: string;
}>;

export type TitleFieldSelectionMode = "AUTO" | "MANUAL";

export type TitleFieldConfig = Readonly<{
  selectionMode: TitleFieldSelectionMode;
  code?: string;
}>;

export type RoundingMode = "HALF_EVEN" | "UP" | "DOWN";

export type NumberPrecisionConfig = Readonly<{
  digits: number;
  decimalPlaces: number;
  roundingMode: RoundingMode;
}>;

// Diff types

export type GeneralSettingsDiffEntry = Readonly<{
  type: "modified";
  field: string;
  details: string;
}>;

export type GeneralSettingsDiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type GeneralSettingsDiff = Readonly<{
  entries: readonly GeneralSettingsDiffEntry[];
  summary: GeneralSettingsDiffSummary;
  isEmpty: boolean;
}>;
