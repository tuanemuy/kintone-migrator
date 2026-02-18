export const VIEW_TYPES = ["LIST", "CALENDAR", "CUSTOM"] as const;

export type ViewType = (typeof VIEW_TYPES)[number];

export const VALID_VIEW_TYPES: ReadonlySet<string> = new Set(VIEW_TYPES);

export const DEVICE_TYPES = ["DESKTOP", "ANY"] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export const VALID_DEVICE_TYPES: ReadonlySet<string> = new Set(DEVICE_TYPES);

// Diff types

export type ViewDiffType = "added" | "modified" | "deleted";

export type ViewDiffEntry = Readonly<{
  type: ViewDiffType;
  viewName: string;
  details: string;
}>;

export type ViewDiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type ViewDiff = Readonly<{
  entries: readonly ViewDiffEntry[];
  summary: ViewDiffSummary;
  isEmpty: boolean;
}>;
