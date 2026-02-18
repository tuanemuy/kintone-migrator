import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type { ReportConfig } from "@/core/domain/report/entity";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";
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
} from "@/core/domain/report/valueObject";

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

const VALID_GROUP_PERS: ReadonlySet<string> = new Set([
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

const VALID_SORT_BYS: ReadonlySet<string> = new Set([
  "TOTAL",
  "GROUP1",
  "GROUP2",
  "GROUP3",
]);

const VALID_SORT_ORDERS: ReadonlySet<string> = new Set(["ASC", "DESC"]);

const VALID_PERIODIC_REPORT_EVERYS: ReadonlySet<string> = new Set([
  "YEAR",
  "QUARTER",
  "MONTH",
  "WEEK",
  "DAY",
  "HOUR",
]);

const VALID_PERIODIC_REPORT_PATTERNS: ReadonlySet<string> = new Set([
  "JAN_APR_JUL_OCT",
  "FEB_MAY_AUG_NOV",
  "MAR_JUN_SEP_DEC",
]);

type KintoneReportGroup = {
  code: string;
  per?: string;
};

type KintoneReportAggregation = {
  type: string;
  code?: string;
};

type KintoneReportSort = {
  by: string;
  order: string;
};

type KintonePeriodicReportPeriod = {
  every: string;
  month?: string;
  pattern?: string;
  dayOfMonth?: string | number;
  time?: string;
  dayOfWeek?: string;
  minute?: number;
};

type KintonePeriodicReport = {
  active: boolean;
  period: KintonePeriodicReportPeriod;
};

type KintoneReportConfig = {
  chartType: string;
  chartMode?: string;
  name: string;
  id?: string;
  index: number | string;
  groups: KintoneReportGroup[];
  aggregations: KintoneReportAggregation[];
  filterCond: string;
  sorts: KintoneReportSort[];
  periodicReport?: KintonePeriodicReport;
};

function fromKintoneGroup(raw: KintoneReportGroup): ReportGroup {
  const result: ReportGroup = { code: raw.code };

  if (raw.per !== undefined) {
    if (!VALID_GROUP_PERS.has(raw.per)) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Unexpected group per value from kintone API: ${raw.per}`,
      );
    }
    return { ...result, per: raw.per as GroupPer };
  }

  return result;
}

function fromKintoneAggregation(
  raw: KintoneReportAggregation,
): ReportAggregation {
  if (!VALID_AGGREGATION_TYPES.has(raw.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected aggregation type value from kintone API: ${raw.type}`,
    );
  }

  const result: ReportAggregation = {
    type: raw.type as AggregationType,
  };

  if (raw.code !== undefined) {
    return { ...result, code: raw.code };
  }

  return result;
}

function fromKintoneSort(raw: KintoneReportSort): ReportSort {
  if (!VALID_SORT_BYS.has(raw.by)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected sort by value from kintone API: ${raw.by}`,
    );
  }
  if (!VALID_SORT_ORDERS.has(raw.order)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected sort order value from kintone API: ${raw.order}`,
    );
  }

  return {
    by: raw.by as SortBy,
    order: raw.order as SortOrder,
  };
}

function fromKintonePeriodicReportPeriod(
  raw: KintonePeriodicReportPeriod,
): PeriodicReportPeriod {
  if (!VALID_PERIODIC_REPORT_EVERYS.has(raw.every)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected periodicReport every value from kintone API: ${raw.every}`,
    );
  }

  if (
    raw.pattern !== undefined &&
    !VALID_PERIODIC_REPORT_PATTERNS.has(raw.pattern)
  ) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected periodicReport pattern value from kintone API: ${raw.pattern}`,
    );
  }

  let dayOfMonth: number | string | undefined;
  if (raw.dayOfMonth !== undefined) {
    if (String(raw.dayOfMonth) === "END_OF_MONTH") {
      dayOfMonth = "END_OF_MONTH";
    } else {
      const parsed = Number(raw.dayOfMonth);
      if (Number.isNaN(parsed)) {
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          `Unexpected periodicReport dayOfMonth value from kintone API: ${String(raw.dayOfMonth)}`,
        );
      }
      dayOfMonth = parsed;
    }
  }

  const period: PeriodicReportPeriod = {
    every: raw.every as PeriodicReportEvery,
    ...(raw.month !== undefined ? { month: Number(raw.month) } : {}),
    ...(raw.pattern !== undefined
      ? { pattern: raw.pattern as PeriodicReportPattern }
      : {}),
    ...(dayOfMonth !== undefined ? { dayOfMonth } : {}),
    ...(raw.time !== undefined ? { time: raw.time } : {}),
    ...(raw.dayOfWeek !== undefined ? { dayOfWeek: raw.dayOfWeek } : {}),
    ...(raw.minute !== undefined ? { minute: raw.minute } : {}),
  };

  return period;
}

function fromKintonePeriodicReport(raw: KintonePeriodicReport): PeriodicReport {
  return {
    active: raw.active,
    period: fromKintonePeriodicReportPeriod(raw.period),
  };
}

function fromKintoneReportConfig(raw: KintoneReportConfig): ReportConfig {
  if (!VALID_CHART_TYPES.has(raw.chartType)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected chartType value from kintone API: ${raw.chartType}`,
    );
  }
  if (
    raw.chartMode !== undefined &&
    raw.chartMode !== "" &&
    !VALID_CHART_MODES.has(raw.chartMode)
  ) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected chartMode value from kintone API: ${raw.chartMode}`,
    );
  }

  const result: ReportConfig = {
    chartType: raw.chartType as ChartType,
    ...(raw.chartMode !== undefined &&
    raw.chartMode !== "" &&
    VALID_CHART_MODES.has(raw.chartMode)
      ? { chartMode: raw.chartMode as ChartMode }
      : {}),
    index: Number(raw.index),
    name: raw.name,
    groups: raw.groups.map(fromKintoneGroup),
    aggregations: raw.aggregations.map(fromKintoneAggregation),
    filterCond: raw.filterCond,
    sorts: raw.sorts.map(fromKintoneSort),
  };

  if (raw.periodicReport !== undefined) {
    return {
      ...result,
      periodicReport: fromKintonePeriodicReport(raw.periodicReport),
    };
  }

  return result;
}

function toKintoneGroup(group: ReportGroup): Record<string, unknown> {
  const result: Record<string, unknown> = { code: group.code };

  if (group.per !== undefined) {
    result.per = group.per;
  }

  return result;
}

function toKintoneAggregation(
  aggregation: ReportAggregation,
): Record<string, unknown> {
  const result: Record<string, unknown> = { type: aggregation.type };

  if (aggregation.code !== undefined) {
    result.code = aggregation.code;
  }

  return result;
}

function toKintoneSort(sort: ReportSort): Record<string, unknown> {
  return {
    by: sort.by,
    order: sort.order,
  };
}

function toKintonePeriodicReportPeriod(
  period: PeriodicReportPeriod,
): Record<string, unknown> {
  const result: Record<string, unknown> = { every: period.every };

  if (period.month !== undefined) {
    result.month = String(period.month);
  }

  if (period.pattern !== undefined) {
    result.pattern = period.pattern;
  }

  if (period.dayOfMonth !== undefined) {
    result.dayOfMonth = period.dayOfMonth;
  }

  if (period.time !== undefined) {
    result.time = period.time;
  }

  if (period.dayOfWeek !== undefined) {
    result.dayOfWeek = period.dayOfWeek;
  }

  if (period.minute !== undefined) {
    result.minute = period.minute;
  }

  return result;
}

function toKintonePeriodicReport(
  periodicReport: PeriodicReport,
): Record<string, unknown> {
  return {
    active: periodicReport.active,
    period: toKintonePeriodicReportPeriod(periodicReport.period),
  };
}

function toKintoneReportConfig(config: ReportConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {
    chartType: config.chartType,
    ...(config.chartMode !== undefined ? { chartMode: config.chartMode } : {}),
    index: config.index,
    name: config.name,
    groups: config.groups.map(toKintoneGroup),
    aggregations: config.aggregations.map(toKintoneAggregation),
    filterCond: config.filterCond,
    sorts: config.sorts.map(toKintoneSort),
  };

  if (config.periodicReport !== undefined) {
    result.periodicReport = toKintonePeriodicReport(config.periodicReport);
  }

  return result;
}

export class KintoneReportConfigurator implements ReportConfigurator {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getReports(): Promise<{
    reports: Readonly<Record<string, ReportConfig>>;
    revision: string;
  }> {
    try {
      const response = await this.client.app.getReports({
        app: this.appId,
        preview: true,
      });

      const rawReports = response.reports as Record<
        string,
        KintoneReportConfig
      >;
      const reports: Record<string, ReportConfig> = {};

      for (const [name, rawConfig] of Object.entries(rawReports)) {
        reports[name] = fromKintoneReportConfig(rawConfig);
      }

      return {
        reports,
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get reports",
        error,
      );
    }
  }

  async updateReports(params: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const kintoneReports: Record<string, Record<string, unknown>> = {};

      for (const [name, config] of Object.entries(params.reports)) {
        kintoneReports[name] = toKintoneReportConfig(config);
      }

      const requestParams: Record<string, unknown> = {
        app: this.appId,
        reports: kintoneReports,
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateReports(
        requestParams as Parameters<typeof this.client.app.updateReports>[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update reports",
        error,
      );
    }
  }
}
