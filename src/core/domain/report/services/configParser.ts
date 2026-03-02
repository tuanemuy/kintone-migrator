import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import { isRecord } from "@/core/domain/typeGuards";
import type { ReportConfig, ReportsConfig } from "../entity";
import { ReportErrorCode } from "../errorCode";
import type {
  PeriodicReport,
  PeriodicReportPeriod,
  ReportAggregation,
  ReportGroup,
  ReportSort,
} from "../valueObject";
import {
  isAggregationType,
  isChartMode,
  isChartType,
  isDayOfWeek,
  isGroupPer,
  isPeriodicReportEvery,
  isPeriodicReportPattern,
  isSortBy,
  isSortOrder,
} from "../valueObject";

function parseGroup(raw: unknown, index: number): ReportGroup {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Group at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Group at index ${index} must have a non-empty "code" property`,
    );
  }

  const result: ReportGroup = { code: obj.code };

  if (obj.per !== undefined && obj.per !== null) {
    if (typeof obj.per !== "string" || !isGroupPer(obj.per)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `Group at index ${index} has invalid per: ${String(obj.per)}. Must be YEAR, QUARTER, MONTH, WEEK, DAY, HOUR, or MINUTE`,
      );
    }
    return { ...result, per: obj.per };
  }

  return result;
}

function parseAggregation(raw: unknown, index: number): ReportAggregation {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Aggregation at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.type !== "string" || !isAggregationType(obj.type)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Aggregation at index ${index} has invalid type: ${String(obj.type)}. Must be COUNT, SUM, AVERAGE, MAX, or MIN`,
    );
  }

  const result: ReportAggregation = {
    type: obj.type,
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
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Sort at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.by !== "string" || !isSortBy(obj.by)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Sort at index ${index} has invalid by: ${String(obj.by)}. Must be TOTAL, GROUP1, GROUP2, or GROUP3`,
    );
  }

  if (typeof obj.order !== "string" || !isSortOrder(obj.order)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Sort at index ${index} has invalid order: ${String(obj.order)}. Must be ASC or DESC`,
    );
  }

  return {
    by: obj.by,
    order: obj.order,
  };
}

function parsePeriodicReportPeriod(raw: unknown): PeriodicReportPeriod {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      "periodicReport.period must be an object",
    );
  }

  const obj = raw;

  if (typeof obj.every !== "string" || !isPeriodicReportEvery(obj.every)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `periodicReport.period has invalid every: ${String(obj.every)}. Must be YEAR, QUARTER, MONTH, WEEK, DAY, or HOUR`,
    );
  }

  const every = obj.every;

  let month: number | undefined;
  if (obj.month !== undefined && obj.month !== null) {
    const parsed = Number(obj.month);
    if (Number.isNaN(parsed)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid month: ${String(obj.month)}. Must be a number`,
      );
    }
    // Validate month range (kintone expects 1-12)
    if (parsed < 1 || parsed > 12) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has out-of-range month: ${parsed}. Must be 1-12`,
      );
    }
    month = parsed;
  }

  let pattern: PeriodicReportPeriod["pattern"];
  if (obj.pattern !== undefined && obj.pattern !== null) {
    if (
      typeof obj.pattern !== "string" ||
      !isPeriodicReportPattern(obj.pattern)
    ) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid pattern: ${String(obj.pattern)}. Must be JAN_APR_JUL_OCT, FEB_MAY_AUG_NOV, or MAR_JUN_SEP_DEC`,
      );
    }
    pattern = obj.pattern;
  }

  let dayOfMonth: number | string | undefined;
  if (obj.dayOfMonth !== undefined && obj.dayOfMonth !== null) {
    if (obj.dayOfMonth === "END_OF_MONTH") {
      dayOfMonth = "END_OF_MONTH";
    } else {
      const parsed = Number(obj.dayOfMonth);
      if (Number.isNaN(parsed)) {
        throw new BusinessRuleError(
          ReportErrorCode.RtInvalidConfigStructure,
          `periodicReport.period has invalid dayOfMonth: ${String(obj.dayOfMonth)}. Must be a number or "END_OF_MONTH"`,
        );
      }
      // Validate dayOfMonth range (kintone expects 1-31)
      if (parsed < 1 || parsed > 31) {
        throw new BusinessRuleError(
          ReportErrorCode.RtInvalidConfigStructure,
          `periodicReport.period has out-of-range dayOfMonth: ${parsed}. Must be 1-31`,
        );
      }
      dayOfMonth = parsed;
    }
  }

  let time: string | undefined;
  if (obj.time !== undefined && obj.time !== null) {
    time = String(obj.time);
  }

  let dayOfWeek: PeriodicReportPeriod["dayOfWeek"];
  if (obj.dayOfWeek !== undefined && obj.dayOfWeek !== null) {
    const dayStr = String(obj.dayOfWeek);
    if (!isDayOfWeek(dayStr)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid dayOfWeek: ${dayStr}. Must be SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, or SATURDAY`,
      );
    }
    dayOfWeek = dayStr;
  }

  let minute: number | undefined;
  if (obj.minute !== undefined && obj.minute !== null) {
    const parsed = Number(obj.minute);
    if (Number.isNaN(parsed)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid minute: ${String(obj.minute)}. Must be a number`,
      );
    }
    // Validate minute range (kintone expects 0-59)
    if (parsed < 0 || parsed > 59) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has out-of-range minute: ${parsed}. Must be 0-59`,
      );
    }
    minute = parsed;
  }

  const result: PeriodicReportPeriod = {
    every,
    ...(month !== undefined ? { month } : {}),
    ...(pattern !== undefined ? { pattern } : {}),
    ...(dayOfMonth !== undefined ? { dayOfMonth } : {}),
    ...(time !== undefined ? { time } : {}),
    ...(dayOfWeek !== undefined ? { dayOfWeek } : {}),
    ...(minute !== undefined ? { minute } : {}),
  };

  return result;
}

function parsePeriodicReport(raw: unknown): PeriodicReport {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      "periodicReport must be an object",
    );
  }

  const obj = raw;

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
  // Reject empty keys early to produce a clearer error message
  if (reportName.length === 0) {
    throw new BusinessRuleError(
      ReportErrorCode.RtEmptyReportName,
      "Report name (key) must not be empty",
    );
  }

  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Report "${reportName}" must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.chartType !== "string" || !isChartType(obj.chartType)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidChartType,
      `Report "${reportName}" has invalid chartType: ${String(obj.chartType)}. Must be BAR, COLUMN, PIE, LINE, PIVOT_TABLE, TABLE, AREA, SPLINE, or SPLINE_AREA`,
    );
  }

  let chartMode: ReportConfig["chartMode"];
  if (obj.chartMode !== undefined && obj.chartMode !== null) {
    if (typeof obj.chartMode !== "string" || !isChartMode(obj.chartMode)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidChartMode,
        `Report "${reportName}" has invalid chartMode: ${String(obj.chartMode)}. Must be NORMAL, STACKED, or PERCENTAGE`,
      );
    }
    chartMode = obj.chartMode;
  }

  const name =
    typeof obj.name === "string" && obj.name.length > 0 ? obj.name : reportName;

  // Validate index is a number when present
  if (
    obj.index !== undefined &&
    obj.index !== null &&
    typeof obj.index !== "number"
  ) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Report "${reportName}" has non-numeric index: ${String(obj.index)}`,
    );
  }
  const index = typeof obj.index === "number" ? obj.index : 0;

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
    chartType: obj.chartType,
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
    const obj = parseYamlConfig(
      rawText,
      {
        emptyConfigText: ReportErrorCode.RtEmptyConfigText,
        invalidConfigYaml: ReportErrorCode.RtInvalidConfigYaml,
        invalidConfigStructure: ReportErrorCode.RtInvalidConfigStructure,
      },
      "Report",
    );

    if (!isRecord(obj.reports)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        'Config must have a "reports" object',
      );
    }

    const rawReports = obj.reports;
    const reports: Record<string, ReportConfig> = {};

    for (const [name, value] of Object.entries(rawReports)) {
      reports[name] = parseReportConfig(value, name);
    }

    return { reports };
  },
};
