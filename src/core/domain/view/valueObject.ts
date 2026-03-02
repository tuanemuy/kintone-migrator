import type { DiffResult } from "../diff";

export const VIEW_TYPES = ["LIST", "CALENDAR", "CUSTOM"] as const;

export type ViewType = (typeof VIEW_TYPES)[number];

const VALID_VIEW_TYPES: ReadonlySet<string> = new Set(VIEW_TYPES);

export function isViewType(value: string): value is ViewType {
  return VALID_VIEW_TYPES.has(value);
}

export const DEVICE_TYPES = ["DESKTOP", "ANY"] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

const VALID_DEVICE_TYPES: ReadonlySet<string> = new Set(DEVICE_TYPES);

export function isDeviceType(value: string): value is DeviceType {
  return VALID_DEVICE_TYPES.has(value);
}

export type ViewDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  viewName: string;
  details: string;
}>;

export type ViewDiff = DiffResult<ViewDiffEntry>;
