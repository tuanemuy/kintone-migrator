export const ReportErrorCode = {
  RtEmptyConfigText: "RT_EMPTY_CONFIG_TEXT",
  RtInvalidConfigYaml: "RT_INVALID_CONFIG_YAML",
  RtInvalidConfigStructure: "RT_INVALID_CONFIG_STRUCTURE",
  RtInvalidChartType: "RT_INVALID_CHART_TYPE",
  RtInvalidChartMode: "RT_INVALID_CHART_MODE",
  RtEmptyReportName: "RT_EMPTY_REPORT_NAME",
} as const;

export type ReportErrorCode =
  (typeof ReportErrorCode)[keyof typeof ReportErrorCode];
