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

function parsePeriodMonth(raw: Record<string, unknown>): number | undefined {
  if (raw.month === undefined || raw.month === null) return undefined;
  const parsed = Number(raw.month);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `periodicReport.period has invalid month: ${String(raw.month)}. Must be an integer between 1 and 12`,
    );
  }
  return parsed;
}

function parsePeriodPattern(
  raw: Record<string, unknown>,
): PeriodicReportPeriod["pattern"] {
  if (raw.pattern === undefined || raw.pattern === null) return undefined;
  if (
    typeof raw.pattern !== "string" ||
    !isPeriodicReportPattern(raw.pattern)
  ) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `periodicReport.period has invalid pattern: ${String(raw.pattern)}. Must be JAN_APR_JUL_OCT, FEB_MAY_AUG_NOV, or MAR_JUN_SEP_DEC`,
    );
  }
  return raw.pattern;
}

function parsePeriodDayOfMonth(
  raw: Record<string, unknown>,
): number | "END_OF_MONTH" | undefined {
  if (raw.dayOfMonth === undefined || raw.dayOfMonth === null) return undefined;
  if (raw.dayOfMonth === "END_OF_MONTH") return "END_OF_MONTH";
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
  return parsed;
}

function parsePeriodDayOfWeek(
  raw: Record<string, unknown>,
): PeriodicReportPeriod["dayOfWeek"] {
  if (raw.dayOfWeek === undefined || raw.dayOfWeek === null) return undefined;
  const dayStr = String(raw.dayOfWeek);
  if (!isDayOfWeek(dayStr)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `periodicReport.period has invalid dayOfWeek: ${dayStr}. Must be SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, or SATURDAY`,
    );
  }
  return dayStr;
}

function parsePeriodMinute(raw: Record<string, unknown>): number | undefined {
  if (raw.minute === undefined || raw.minute === null) return undefined;
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
  return parsed;
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

  const month = parsePeriodMonth(raw);
  const pattern = parsePeriodPattern(raw);
  const dayOfMonth = parsePeriodDayOfMonth(raw);
  const time =
    raw.time !== undefined && raw.time !== null ? String(raw.time) : undefined;
  const dayOfWeek = parsePeriodDayOfWeek(raw);
  const minute = parsePeriodMinute(raw);

  return {
    every: raw.every,
    ...(month !== undefined ? { month } : {}),
    ...(pattern !== undefined ? { pattern } : {}),
    ...(dayOfMonth !== undefined ? { dayOfMonth } : {}),
    ...(time !== undefined ? { time } : {}),
    ...(dayOfWeek !== undefined ? { dayOfWeek } : {}),
    ...(minute !== undefined ? { minute } : {}),
  };
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

function parseOptionalArrayField<T>(
  raw: Record<string, unknown>,
  fieldName: string,
  reportName: string,
  parseFn: (item: unknown, index: number) => T,
): T[] {
  const value = raw[fieldName];
  if (value !== undefined && !Array.isArray(value)) {
    throw new BusinessRuleError(
      ReportErrorCode.RtInvalidConfigStructure,
      `Report "${reportName}" has invalid ${fieldName}: must be an array`,
    );
  }
  return Array.isArray(value)
    ? value.map((item: unknown, i: number) => parseFn(item, i))
    : [];
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

  const groups = parseOptionalArrayField(raw, "groups", reportName, parseGroup);
  const aggregations = parseOptionalArrayField(
    raw,
    "aggregations",
    reportName,
    parseAggregation,
  );
  const filterCond = typeof raw.filterCond === "string" ? raw.filterCond : "";
  const sorts = parseOptionalArrayField(raw, "sorts", reportName, parseSort);

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
