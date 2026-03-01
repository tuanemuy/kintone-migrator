import type { DiffResult } from "../diff";

export const CHART_TYPES = [
  "BAR",
  "COLUMN",
  "PIE",
  "LINE",
  "PIVOT_TABLE",
  "TABLE",
  "AREA",
  "SPLINE",
  "SPLINE_AREA",
] as const;

export type ChartType = (typeof CHART_TYPES)[number];

export const VALID_CHART_TYPES: ReadonlySet<string> = new Set(CHART_TYPES);

export function isChartType(value: string): value is ChartType {
  return VALID_CHART_TYPES.has(value);
}

export const CHART_MODES = ["NORMAL", "STACKED", "PERCENTAGE"] as const;

export type ChartMode = (typeof CHART_MODES)[number];

export const VALID_CHART_MODES: ReadonlySet<string> = new Set(CHART_MODES);

export function isChartMode(value: string): value is ChartMode {
  return VALID_CHART_MODES.has(value);
}

export const GROUP_PERS = [
  "YEAR",
  "QUARTER",
  "MONTH",
  "WEEK",
  "DAY",
  "HOUR",
  "MINUTE",
] as const;

export type GroupPer = (typeof GROUP_PERS)[number];

export const VALID_GROUP_PERS: ReadonlySet<string> = new Set(GROUP_PERS);

export function isGroupPer(value: string): value is GroupPer {
  return VALID_GROUP_PERS.has(value);
}

export type ReportGroup = Readonly<{
  code: string;
  per?: GroupPer;
}>;

export const AGGREGATION_TYPES = [
  "COUNT",
  "SUM",
  "AVERAGE",
  "MAX",
  "MIN",
] as const;

export type AggregationType = (typeof AGGREGATION_TYPES)[number];

export const VALID_AGGREGATION_TYPES: ReadonlySet<string> = new Set(
  AGGREGATION_TYPES,
);

export function isAggregationType(value: string): value is AggregationType {
  return VALID_AGGREGATION_TYPES.has(value);
}

export type ReportAggregation = Readonly<{
  type: AggregationType;
  code?: string;
}>;

export const SORT_BYS = ["TOTAL", "GROUP1", "GROUP2", "GROUP3"] as const;

export type SortBy = (typeof SORT_BYS)[number];

export const VALID_SORT_BYS: ReadonlySet<string> = new Set(SORT_BYS);

export function isSortBy(value: string): value is SortBy {
  return VALID_SORT_BYS.has(value);
}

export const SORT_ORDERS = ["ASC", "DESC"] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

export const VALID_SORT_ORDERS: ReadonlySet<string> = new Set(SORT_ORDERS);

export function isSortOrder(value: string): value is SortOrder {
  return VALID_SORT_ORDERS.has(value);
}

export type ReportSort = Readonly<{
  by: SortBy;
  order: SortOrder;
}>;

export const PERIODIC_REPORT_EVERYS = [
  "YEAR",
  "QUARTER",
  "MONTH",
  "WEEK",
  "DAY",
  "HOUR",
] as const;

export type PeriodicReportEvery = (typeof PERIODIC_REPORT_EVERYS)[number];

export const VALID_PERIODIC_REPORT_EVERYS: ReadonlySet<string> = new Set(
  PERIODIC_REPORT_EVERYS,
);

export function isPeriodicReportEvery(
  value: string,
): value is PeriodicReportEvery {
  return VALID_PERIODIC_REPORT_EVERYS.has(value);
}

export const PERIODIC_REPORT_PATTERNS = [
  "JAN_APR_JUL_OCT",
  "FEB_MAY_AUG_NOV",
  "MAR_JUN_SEP_DEC",
] as const;

export type PeriodicReportPattern = (typeof PERIODIC_REPORT_PATTERNS)[number];

export const VALID_PERIODIC_REPORT_PATTERNS: ReadonlySet<string> = new Set(
  PERIODIC_REPORT_PATTERNS,
);

export function isPeriodicReportPattern(
  value: string,
): value is PeriodicReportPattern {
  return VALID_PERIODIC_REPORT_PATTERNS.has(value);
}

export const DAYS_OF_WEEK = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const VALID_DAYS_OF_WEEK: ReadonlySet<string> = new Set(DAYS_OF_WEEK);

export function isDayOfWeek(value: string): value is DayOfWeek {
  return VALID_DAYS_OF_WEEK.has(value);
}

export type PeriodicReportPeriod = Readonly<{
  every: PeriodicReportEvery;
  month?: number;
  pattern?: PeriodicReportPattern;
  dayOfMonth?: number | string;
  time?: string;
  dayOfWeek?: DayOfWeek;
  minute?: number;
}>;

export type PeriodicReport = Readonly<{
  active: boolean;
  period: PeriodicReportPeriod;
}>;

export type ReportDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  reportName: string;
  details: string;
}>;

export type ReportDiff = DiffResult<ReportDiffEntry>;
