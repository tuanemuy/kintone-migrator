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
