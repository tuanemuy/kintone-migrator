export const ReportErrorCode = {
  RtInvalidConfigStructure: "RT_INVALID_CONFIG_STRUCTURE",
  RtInvalidChartType: "RT_INVALID_CHART_TYPE",
  RtInvalidChartMode: "RT_INVALID_CHART_MODE",
  RtEmptyReportName: "RT_EMPTY_REPORT_NAME",
  RtUnresolvedConflict: "RT_UNRESOLVED_CONFLICT",
} as const;

export type ReportErrorCode =
  (typeof ReportErrorCode)[keyof typeof ReportErrorCode];
