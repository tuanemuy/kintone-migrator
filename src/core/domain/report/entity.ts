import type {
  ChartMode,
  ChartType,
  PeriodicReport,
  ReportAggregation,
  ReportGroup,
  ReportSort,
} from "./valueObject";

export type ReportConfig = Readonly<{
  chartType: ChartType;
  chartMode?: ChartMode;
  index: number;
  name: string;
  groups: readonly ReportGroup[];
  aggregations: readonly ReportAggregation[];
  filterCond: string;
  sorts: readonly ReportSort[];
  periodicReport?: PeriodicReport;
}>;

export type ReportsConfig = Readonly<{
  reports: Readonly<Record<string, ReportConfig>>;
}>;
