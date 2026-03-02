import { serializeToYaml } from "@/core/domain/services/yamlConfigSerializer";
import type { ReportConfig, ReportsConfig } from "../entity";
import type {
  PeriodicReport,
  PeriodicReportPeriod,
  ReportAggregation,
  ReportGroup,
  ReportSort,
} from "../valueObject";

function serializeGroup(group: ReportGroup): Record<string, unknown> {
  const result: Record<string, unknown> = { code: group.code };

  if (group.per !== undefined) {
    result.per = group.per;
  }

  return result;
}

function serializeAggregation(
  aggregation: ReportAggregation,
): Record<string, unknown> {
  const result: Record<string, unknown> = { type: aggregation.type };

  if (aggregation.code !== undefined) {
    result.code = aggregation.code;
  }

  return result;
}

function serializeSort(sort: ReportSort): Record<string, unknown> {
  return {
    by: sort.by,
    order: sort.order,
  };
}

function serializePeriodicReportPeriod(
  period: PeriodicReportPeriod,
): Record<string, unknown> {
  const result: Record<string, unknown> = { every: period.every };

  if (period.month !== undefined) {
    result.month = period.month;
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

function serializePeriodicReport(
  periodicReport: PeriodicReport,
): Record<string, unknown> {
  return {
    active: periodicReport.active,
    period: serializePeriodicReportPeriod(periodicReport.period),
  };
}

function serializeReportConfig(config: ReportConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {
    chartType: config.chartType,
    ...(config.chartMode !== undefined ? { chartMode: config.chartMode } : {}),
    index: config.index,
    groups: config.groups.map(serializeGroup),
    aggregations: config.aggregations.map(serializeAggregation),
    filterCond: config.filterCond,
    sorts: config.sorts.map(serializeSort),
  };

  if (config.periodicReport !== undefined) {
    result.periodicReport = serializePeriodicReport(config.periodicReport);
  }

  return result;
}

export const ReportConfigSerializer = {
  serialize: (config: ReportsConfig): string => {
    const serialized: Record<string, unknown> = {};
    const reports: Record<string, unknown> = {};

    for (const [name, reportConfig] of Object.entries(config.reports)) {
      reports[name] = serializeReportConfig(reportConfig);
    }

    serialized.reports = reports;

    return serializeToYaml(serialized);
  },
};
