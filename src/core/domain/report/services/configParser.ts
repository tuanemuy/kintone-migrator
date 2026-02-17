import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import type { ReportConfig, ReportsConfig } from "../entity";
import { ReportErrorCode } from "../errorCode";
import type {
  AggregationType,
  ChartMode,
  ChartType,
  GroupPer,
  PeriodicReport,
  PeriodicReportEvery,
  PeriodicReportPattern,
  PeriodicReportPeriod,
  ReportAggregation,
  ReportGroup,
  ReportSort,
  SortBy,
  SortOrder,
} from "../valueObject";

const VALID_CHART_TYPES: ReadonlySet<string> = new Set([
  "BAR",
  "COLUMN",
  "PIE",
  "LINE",
  "PIVOT_TABLE",
  "TABLE",
  "AREA",
  "SPLINE",
  "SPLINE_AREA",
]);

const VALID_CHART_MODES: ReadonlySet<string> = new Set([
  "NORMAL",
  "STACKED",
  "PERCENTAGE",
]);

const VALID_GROUP_PER: ReadonlySet<string> = new Set([
  "YEAR",
  "QUARTER",
  "MONTH",
  "WEEK",
  "DAY",
  "HOUR",
  "MINUTE",
]);

const VALID_AGGREGATION_TYPES: ReadonlySet<string> = new Set([
  "COUNT",
  "SUM",
  "AVERAGE",
  "MAX",
  "MIN",
]);

const VALID_SORT_BY: ReadonlySet<string> = new Set([
  "TOTAL",
  "GROUP1",
  "GROUP2",
  "GROUP3",
]);

const VALID_DAY_OF_WEEK: ReadonlySet<string> = new Set([
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);

const VALID_PERIODIC_PATTERN: ReadonlySet<string> = new Set([
  "JAN_APR_JUL_OCT",
  "FEB_MAY_AUG_NOV",
  "MAR_JUN_SEP_DEC",
]);

const VALID_SORT_ORDER: ReadonlySet<string> = new Set(["ASC", "DESC"]);

const VALID_PERIODIC_EVERY: ReadonlySet<string> = new Set([
  "YEAR",
  "QUARTER",
  "MONTH",
  "WEEK",
  "DAY",
  "HOUR",
]);

function parseGroup(raw: unknown, index: number): ReportGroup {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Group at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Group at index ${index} must have a non-empty "code" property`,
    );
  }

  const result: ReportGroup = { code: obj.code };

  if (obj.per !== undefined && obj.per !== null) {
    if (typeof obj.per !== "string" || !VALID_GROUP_PER.has(obj.per)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `Group at index ${index} has invalid per: ${String(obj.per)}. Must be YEAR, QUARTER, MONTH, WEEK, DAY, HOUR, or MINUTE`,
      );
    }
    return { ...result, per: obj.per as GroupPer };
  }

  return result;
}

function parseAggregation(raw: unknown, index: number): ReportAggregation {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Aggregation at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== "string" || !VALID_AGGREGATION_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Aggregation at index ${index} has invalid type: ${String(obj.type)}. Must be COUNT, SUM, AVERAGE, MAX, or MIN`,
    );
  }

  const result: ReportAggregation = {
    type: obj.type as AggregationType,
  };

  if (obj.code !== undefined && obj.code !== null) {
    if (typeof obj.code !== "string") {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `Aggregation at index ${index} has invalid code: must be a string`,
      );
    }
    return { ...result, code: obj.code };
  }

  return result;
}

function parseSort(raw: unknown, index: number): ReportSort {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Sort at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.by !== "string" || !VALID_SORT_BY.has(obj.by)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Sort at index ${index} has invalid by: ${String(obj.by)}. Must be TOTAL, GROUP1, GROUP2, or GROUP3`,
    );
  }

  if (typeof obj.order !== "string" || !VALID_SORT_ORDER.has(obj.order)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Sort at index ${index} has invalid order: ${String(obj.order)}. Must be ASC or DESC`,
    );
  }

  return {
    by: obj.by as SortBy,
    order: obj.order as SortOrder,
  };
}

function parsePeriodicReportPeriod(raw: unknown): PeriodicReportPeriod {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      "periodicReport.period must be an object",
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.every !== "string" || !VALID_PERIODIC_EVERY.has(obj.every)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `periodicReport.period has invalid every: ${String(obj.every)}. Must be YEAR, QUARTER, MONTH, WEEK, DAY, or HOUR`,
    );
  }

  const result: Record<string, unknown> = {
    every: obj.every as PeriodicReportEvery,
  };

  if (obj.month !== undefined && obj.month !== null) {
    result.month = Number(obj.month);
  }

  if (obj.pattern !== undefined && obj.pattern !== null) {
    if (
      typeof obj.pattern !== "string" ||
      !VALID_PERIODIC_PATTERN.has(obj.pattern)
    ) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid pattern: ${String(obj.pattern)}. Must be JAN_APR_JUL_OCT, FEB_MAY_AUG_NOV, or MAR_JUN_SEP_DEC`,
      );
    }
    result.pattern = obj.pattern as PeriodicReportPattern;
  }

  if (obj.dayOfMonth !== undefined && obj.dayOfMonth !== null) {
    if (obj.dayOfMonth === "END_OF_MONTH") {
      result.dayOfMonth = "END_OF_MONTH";
    } else {
      result.dayOfMonth = Number(obj.dayOfMonth);
    }
  }

  if (obj.time !== undefined && obj.time !== null) {
    result.time = String(obj.time);
  }

  if (obj.dayOfWeek !== undefined && obj.dayOfWeek !== null) {
    const dayStr = String(obj.dayOfWeek);
    if (!VALID_DAY_OF_WEEK.has(dayStr)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid dayOfWeek: ${dayStr}. Must be SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, or SATURDAY`,
      );
    }
    result.dayOfWeek = dayStr;
  }

  if (obj.minute !== undefined && obj.minute !== null) {
    result.minute = Number(obj.minute);
  }

  return result as PeriodicReportPeriod;
}

function parsePeriodicReport(raw: unknown): PeriodicReport {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      "periodicReport must be an object",
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.active !== "boolean") {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      "periodicReport.active must be a boolean",
    );
  }

  const period = parsePeriodicReportPeriod(obj.period);

  return {
    active: obj.active,
    period,
  };
}

function parseReportConfig(raw: unknown, reportName: string): ReportConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Report "${reportName}" must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (
    typeof obj.chartType !== "string" ||
    !VALID_CHART_TYPES.has(obj.chartType)
  ) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidChartType,
      `Report "${reportName}" has invalid chartType: ${String(obj.chartType)}. Must be BAR, COLUMN, PIE, LINE, PIVOT_TABLE, TABLE, AREA, SPLINE, or SPLINE_AREA`,
    );
  }

  let chartMode: ChartMode | undefined;
  if (obj.chartMode !== undefined && obj.chartMode !== null) {
    if (
      typeof obj.chartMode !== "string" ||
      !VALID_CHART_MODES.has(obj.chartMode)
    ) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidChartMode,
        `Report "${reportName}" has invalid chartMode: ${String(obj.chartMode)}. Must be NORMAL, STACKED, or PERCENTAGE`,
      );
    }
    chartMode = obj.chartMode as ChartMode;
  }

  const name =
    typeof obj.name === "string" && obj.name.length > 0 ? obj.name : reportName;

  if (name.length === 0) {
    throw new BusinessRuleError(
      ReportErrorCode.RtEmptyReportName,
      "Report must have a non-empty name",
    );
  }

  const index =
    obj.index !== undefined && obj.index !== null ? Number(obj.index) : 0;

  const groups = Array.isArray(obj.groups)
    ? obj.groups.map((item: unknown, i: number) => parseGroup(item, i))
    : [];

  const aggregations = Array.isArray(obj.aggregations)
    ? obj.aggregations.map((item: unknown, i: number) =>
        parseAggregation(item, i),
      )
    : [];

  const filterCond = typeof obj.filterCond === "string" ? obj.filterCond : "";

  const sorts = Array.isArray(obj.sorts)
    ? obj.sorts.map((item: unknown, i: number) => parseSort(item, i))
    : [];

  const result: ReportConfig = {
    chartType: obj.chartType as ChartType,
    ...(chartMode !== undefined ? { chartMode } : {}),
    index,
    name,
    groups,
    aggregations,
    filterCond,
    sorts,
  };

  if (obj.periodicReport !== undefined && obj.periodicReport !== null) {
    return {
      ...result,
      periodicReport: parsePeriodicReport(obj.periodicReport),
    };
  }

  return result;
}

export const ReportConfigParser = {
  parse: (rawText: string): ReportsConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        ReportErrorCode.RtEmptyConfigText,
        "Report config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (typeof obj.reports !== "object" || obj.reports === null) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        'Config must have a "reports" object',
      );
    }

    const rawReports = obj.reports as Record<string, unknown>;
    const reports: Record<string, ReportConfig> = {};

    for (const [name, value] of Object.entries(rawReports)) {
      reports[name] = parseReportConfig(value, name);
    }

    return { reports };
  },
};
