import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "@/core/domain/services/configValidator";
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

  if (typeof raw.code !== "string" || raw.code.length === 0) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Group at index ${index} must have a non-empty "code" property`,
    );
  }

  const result: ReportGroup = { code: raw.code };

  if (raw.per !== undefined && raw.per !== null) {
    if (typeof raw.per !== "string" || !isGroupPer(raw.per)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `Group at index ${index} has invalid per: ${String(raw.per)}. Must be YEAR, QUARTER, MONTH, WEEK, DAY, HOUR, or MINUTE`,
      );
    }
    return { ...result, per: raw.per };
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

  if (typeof raw.type !== "string" || !isAggregationType(raw.type)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Aggregation at index ${index} has invalid type: ${String(raw.type)}. Must be COUNT, SUM, AVERAGE, MAX, or MIN`,
    );
  }

  const result: ReportAggregation = {
    type: raw.type,
  };

  if (raw.code !== undefined && raw.code !== null) {
    if (typeof raw.code !== "string") {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `Aggregation at index ${index} has invalid code: must be a string`,
      );
    }
    return { ...result, code: raw.code };
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

  if (typeof raw.by !== "string" || !isSortBy(raw.by)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Sort at index ${index} has invalid by: ${String(raw.by)}. Must be TOTAL, GROUP1, GROUP2, or GROUP3`,
    );
  }

  if (typeof raw.order !== "string" || !isSortOrder(raw.order)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Sort at index ${index} has invalid order: ${String(raw.order)}. Must be ASC or DESC`,
    );
  }

  return {
    by: raw.by,
    order: raw.order,
  };
}

function parsePeriodicReportPeriod(raw: unknown): PeriodicReportPeriod {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      "periodicReport.period must be an object",
    );
  }

  if (typeof raw.every !== "string" || !isPeriodicReportEvery(raw.every)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `periodicReport.period has invalid every: ${String(raw.every)}. Must be YEAR, QUARTER, MONTH, WEEK, DAY, or HOUR`,
    );
  }

  const every = raw.every;

  let month: number | undefined;
  if (raw.month !== undefined && raw.month !== null) {
    const parsed = Number(raw.month);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid month: ${String(raw.month)}. Must be an integer between 1 and 12`,
      );
    }
    month = parsed;
  }

  let pattern: PeriodicReportPeriod["pattern"];
  if (raw.pattern !== undefined && raw.pattern !== null) {
    if (
      typeof raw.pattern !== "string" ||
      !isPeriodicReportPattern(raw.pattern)
    ) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid pattern: ${String(raw.pattern)}. Must be JAN_APR_JUL_OCT, FEB_MAY_AUG_NOV, or MAR_JUN_SEP_DEC`,
      );
    }
    pattern = raw.pattern;
  }

  let dayOfMonth: number | "END_OF_MONTH" | undefined;
  if (raw.dayOfMonth !== undefined && raw.dayOfMonth !== null) {
    if (raw.dayOfMonth === "END_OF_MONTH") {
      dayOfMonth = "END_OF_MONTH";
    } else {
      const parsed = Number(raw.dayOfMonth);
      if (!Number.isInteger(parsed)) {
        throw new BusinessRuleError(
          ReportErrorCode.RtInvalidConfigStructure,
          `periodicReport.period has invalid dayOfMonth: ${String(raw.dayOfMonth)}. Must be an integer or "END_OF_MONTH"`,
        );
      }
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
  if (raw.time !== undefined && raw.time !== null) {
    time = String(raw.time);
  }

  let dayOfWeek: PeriodicReportPeriod["dayOfWeek"];
  if (raw.dayOfWeek !== undefined && raw.dayOfWeek !== null) {
    const dayStr = String(raw.dayOfWeek);
    if (!isDayOfWeek(dayStr)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid dayOfWeek: ${dayStr}. Must be SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, or SATURDAY`,
      );
    }
    dayOfWeek = dayStr;
  }

  let minute: number | undefined;
  if (raw.minute !== undefined && raw.minute !== null) {
    const parsed = Number(raw.minute);
    if (
      !Number.isInteger(parsed) ||
      parsed < 0 ||
      parsed > 50 ||
      parsed % 10 !== 0
    ) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidConfigStructure,
        `periodicReport.period has invalid minute: ${String(raw.minute)}. Must be a multiple of 10 (0, 10, 20, 30, 40, 50)`,
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

  const active = raw.active;
  if (typeof active !== "boolean") {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      "periodicReport.active must be a boolean",
    );
  }

  const period = parsePeriodicReportPeriod(raw.period);

  return {
    active,
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

  if (typeof raw.chartType !== "string" || !isChartType(raw.chartType)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidChartType,
      `Report "${reportName}" has invalid chartType: ${String(raw.chartType)}. Must be BAR, COLUMN, PIE, LINE, PIVOT_TABLE, TABLE, AREA, SPLINE, or SPLINE_AREA`,
    );
  }

  let chartMode: ReportConfig["chartMode"];
  if (raw.chartMode !== undefined && raw.chartMode !== null) {
    if (typeof raw.chartMode !== "string" || !isChartMode(raw.chartMode)) {
      throw new BusinessRuleError(
        ReportErrorCode.RtInvalidChartMode,
        `Report "${reportName}" has invalid chartMode: ${String(raw.chartMode)}. Must be NORMAL, STACKED, or PERCENTAGE`,
      );
    }
    chartMode = raw.chartMode;
  }

  const name =
    typeof raw.name === "string" && raw.name.length > 0 ? raw.name : reportName;

  // Validate index is a non-negative integer when present
  if (
    raw.index !== undefined &&
    raw.index !== null &&
    (typeof raw.index !== "number" ||
      !Number.isInteger(raw.index) ||
      raw.index < 0)
  ) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Report "${reportName}" has invalid index: ${String(raw.index)}. Must be a non-negative integer`,
    );
  }
  const index = typeof raw.index === "number" ? raw.index : 0;

  if (raw.groups !== undefined && !Array.isArray(raw.groups)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Report "${reportName}" has invalid groups: must be an array`,
    );
  }
  const groups = Array.isArray(raw.groups)
    ? raw.groups.map((item: unknown, i: number) => parseGroup(item, i))
    : [];

  if (raw.aggregations !== undefined && !Array.isArray(raw.aggregations)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Report "${reportName}" has invalid aggregations: must be an array`,
    );
  }
  const aggregations = Array.isArray(raw.aggregations)
    ? raw.aggregations.map((item: unknown, i: number) =>
        parseAggregation(item, i),
      )
    : [];

  const filterCond = typeof raw.filterCond === "string" ? raw.filterCond : "";

  if (raw.sorts !== undefined && !Array.isArray(raw.sorts)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Report "${reportName}" has invalid sorts: must be an array`,
    );
  }
  const sorts = Array.isArray(raw.sorts)
    ? raw.sorts.map((item: unknown, i: number) => parseSort(item, i))
    : [];

  const result: ReportConfig = {
    chartType: raw.chartType,
    ...(chartMode !== undefined ? { chartMode } : {}),
    index,
    name,
    groups,
    aggregations,
    filterCond,
    sorts,
  };

  if (raw.periodicReport !== undefined && raw.periodicReport !== null) {
    return {
      ...result,
      periodicReport: parsePeriodicReport(raw.periodicReport),
    };
  }

  return result;
}

export const ReportConfigParser = {
  parse: (parsed: unknown): ReportsConfig => {
    const obj = validateParsedConfig(
      parsed,
      ReportErrorCode.RtInvalidConfigStructure,
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
