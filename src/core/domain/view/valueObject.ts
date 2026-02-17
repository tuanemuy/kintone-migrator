export const VIEW_TYPES = ["LIST", "CALENDAR", "CUSTOM"] as const;

export type ViewType = (typeof VIEW_TYPES)[number];

export const VALID_VIEW_TYPES: ReadonlySet<string> = new Set(VIEW_TYPES);

export const DEVICE_TYPES = ["DESKTOP", "ANY"] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export const VALID_DEVICE_TYPES: ReadonlySet<string> = new Set(DEVICE_TYPES);
