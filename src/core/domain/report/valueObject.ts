export type ChartType =
  | "BAR"
  | "COLUMN"
  | "PIE"
  | "LINE"
  | "PIVOT_TABLE"
  | "TABLE"
  | "AREA"
  | "SPLINE"
  | "SPLINE_AREA";

export type ChartMode = "NORMAL" | "STACKED" | "PERCENTAGE";

export type GroupPer =
  | "YEAR"
  | "QUARTER"
  | "MONTH"
  | "WEEK"
  | "DAY"
  | "HOUR"
  | "MINUTE";

export type ReportGroup = Readonly<{
  code: string;
  per?: GroupPer;
}>;

export type AggregationType = "COUNT" | "SUM" | "AVERAGE" | "MAX" | "MIN";

export type ReportAggregation = Readonly<{
  type: AggregationType;
  code?: string;
}>;

export type SortBy = "TOTAL" | "GROUP1" | "GROUP2" | "GROUP3";

export type SortOrder = "ASC" | "DESC";

export type ReportSort = Readonly<{
  by: SortBy;
  order: SortOrder;
}>;

export type PeriodicReportEvery =
  | "YEAR"
  | "QUARTER"
  | "MONTH"
  | "WEEK"
  | "DAY"
  | "HOUR";

export type PeriodicReportPattern =
  | "JAN_APR_JUL_OCT"
  | "FEB_MAY_AUG_NOV"
  | "MAR_JUN_SEP_DEC";

export type PeriodicReportPeriod = Readonly<{
  every: PeriodicReportEvery;
  month?: number;
  pattern?: PeriodicReportPattern;
  dayOfMonth?: number | string;
  time?: string;
  dayOfWeek?: string;
  minute?: number;
}>;

export type PeriodicReport = Readonly<{
  active: boolean;
  period: PeriodicReportPeriod;
}>;

// Diff types

import type { DiffResult } from "../diff";

export type ReportDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  reportName: string;
  details: string;
}>;

export type ReportDiff = DiffResult<ReportDiffEntry>;
