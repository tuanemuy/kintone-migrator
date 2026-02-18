import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { ReportErrorCode } from "../../errorCode";
import { ReportConfigParser } from "../configParser";

describe("ReportConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple reports", () => {
      const yaml = `
reports:
  月次タスク集計:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups:
      - code: 作成日時
        per: MONTH
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts:
      - by: GROUP1
        order: ASC
  担当者別タスク数:
    chartType: PIE
    chartMode: NORMAL
    index: 1
    groups:
      - code: 担当者
    aggregations:
      - type: COUNT
    filterCond: 'ステータス not in ("完了")'
`;
      const config = ReportConfigParser.parse(yaml);

      expect(Object.keys(config.reports)).toHaveLength(2);

      const report1 = config.reports.月次タスク集計;
      expect(report1.chartType).toBe("COLUMN");
      expect(report1.chartMode).toBe("NORMAL");
      expect(report1.index).toBe(0);
      expect(report1.name).toBe("月次タスク集計");
      expect(report1.groups).toHaveLength(1);
      expect(report1.groups[0]).toEqual({ code: "作成日時", per: "MONTH" });
      expect(report1.aggregations).toHaveLength(1);
      expect(report1.aggregations[0]).toEqual({ type: "COUNT" });
      expect(report1.sorts).toHaveLength(1);
      expect(report1.sorts[0]).toEqual({ by: "GROUP1", order: "ASC" });

      const report2 = config.reports.担当者別タスク数;
      expect(report2.chartType).toBe("PIE");
      expect(report2.name).toBe("担当者別タスク数");
    });

    it("should use map key as name when name property is absent", () => {
      const yaml = `
reports:
  テストレポート:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.テストレポート.name).toBe("テストレポート");
    });

    it("should prefer explicit name property over map key", () => {
      const yaml = `
reports:
  キー名:
    chartType: BAR
    chartMode: NORMAL
    name: 明示的な名前
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.キー名.name).toBe("明示的な名前");
    });

    it("should parse config with periodicReport", () => {
      const yaml = `
reports:
  定期レポート:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups:
      - code: 作成日時
        per: MONTH
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: MONTH
        dayOfMonth: 1
        time: "08:00"
`;
      const config = ReportConfigParser.parse(yaml);
      const report = config.reports.定期レポート;

      expect(report.periodicReport).toBeDefined();
      expect(report.periodicReport?.active).toBe(true);
      expect(report.periodicReport?.period.every).toBe("MONTH");
      expect(report.periodicReport?.period.dayOfMonth).toBe(1);
      expect(report.periodicReport?.period.time).toBe("08:00");
    });

    it("should parse config without periodicReport", () => {
      const yaml = `
reports:
  シンプルレポート:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.シンプルレポート.periodicReport).toBeUndefined();
    });

    it("should parse aggregation with code", () => {
      const yaml = `
reports:
  集計レポート:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups:
      - code: カテゴリ
    aggregations:
      - type: SUM
        code: 金額
    filterCond: ""
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.集計レポート.aggregations[0]).toEqual({
        type: "SUM",
        code: "金額",
      });
    });

    it("should parse group without per", () => {
      const yaml = `
reports:
  グループレポート:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups:
      - code: 担当者
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.グループレポート.groups[0].per).toBeUndefined();
    });

    it("should parse all chart types", () => {
      const chartTypes = [
        "BAR",
        "COLUMN",
        "PIE",
        "LINE",
        "PIVOT_TABLE",
        "TABLE",
        "AREA",
        "SPLINE",
        "SPLINE_AREA",
      ];
      for (const chartType of chartTypes) {
        const yaml = `
reports:
  テスト:
    chartType: ${chartType}
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts: []
`;
        const config = ReportConfigParser.parse(yaml);
        expect(config.reports.テスト.chartType).toBe(chartType);
      }
    });

    it("should parse all chart modes", () => {
      const chartModes = ["NORMAL", "STACKED", "PERCENTAGE"];
      for (const chartMode of chartModes) {
        const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: ${chartMode}
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts: []
`;
        const config = ReportConfigParser.parse(yaml);
        expect(config.reports.テスト.chartMode).toBe(chartMode);
      }
    });

    it("should default index to 0 when not provided", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: NORMAL
    groups: []
    aggregations: []
    filterCond: ""
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.テスト.index).toBe(0);
    });

    it("should throw RtEmptyConfigText for empty text", () => {
      expect(() => ReportConfigParser.parse("")).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtEmptyConfigText,
        }),
      );
    });

    it("should throw RtEmptyConfigText for whitespace-only text", () => {
      expect(() => ReportConfigParser.parse("   \n  ")).toThrow(
        BusinessRuleError,
      );
      expect(() => ReportConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtEmptyConfigText,
        }),
      );
    });

    it("should throw RtInvalidConfigYaml for invalid YAML", () => {
      expect(() => ReportConfigParser.parse("{ invalid: yaml:")).toThrow(
        BusinessRuleError,
      );
      expect(() => ReportConfigParser.parse("{ invalid: yaml:")).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigYaml,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for non-object YAML", () => {
      expect(() => ReportConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => ReportConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure when reports is missing", () => {
      const yaml = `
someOtherKey: value
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidChartType for invalid chart type", () => {
      const yaml = `
reports:
  テスト:
    chartType: INVALID
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidChartType,
        }),
      );
    });

    it("should throw RtInvalidChartMode for invalid chart mode", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: INVALID
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidChartMode,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for invalid group per", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups:
      - code: フィールド
        per: INVALID
    aggregations: []
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for invalid aggregation type", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations:
      - type: INVALID
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for invalid sort by", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts:
      - by: INVALID
        order: ASC
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for invalid sort order", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts:
      - by: GROUP1
        order: INVALID
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should parse empty reports object", () => {
      const yaml = `
reports: {}
`;
      const config = ReportConfigParser.parse(yaml);
      expect(Object.keys(config.reports)).toHaveLength(0);
    });

    it("should parse all valid sort by values", () => {
      const sortByValues = ["TOTAL", "GROUP1", "GROUP2", "GROUP3"];
      for (const sortBy of sortByValues) {
        const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts:
      - by: ${sortBy}
        order: ASC
`;
        const config = ReportConfigParser.parse(yaml);
        expect(config.reports.テスト.sorts[0].by).toBe(sortBy);
      }
    });

    it("should reject old GROUP sort by value", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts:
      - by: GROUP
        order: ASC
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should parse periodicReport with month", () => {
      const yaml = `
reports:
  年次レポート:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: YEAR
        month: 4
        dayOfMonth: 1
        time: "09:00"
`;
      const config = ReportConfigParser.parse(yaml);
      const report = config.reports.年次レポート;
      expect(report.periodicReport?.period.month).toBe(4);
    });

    it("should parse periodicReport with pattern for QUARTER", () => {
      const yaml = `
reports:
  四半期レポート:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: QUARTER
        pattern: JAN_APR_JUL_OCT
        dayOfMonth: 1
        time: "09:00"
`;
      const config = ReportConfigParser.parse(yaml);
      const report = config.reports.四半期レポート;
      expect(report.periodicReport?.period.pattern).toBe("JAN_APR_JUL_OCT");
    });

    it("should throw for invalid periodicReport pattern", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: QUARTER
        pattern: INVALID_PATTERN
        dayOfMonth: 1
        time: "09:00"
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should parse dayOfMonth with END_OF_MONTH", () => {
      const yaml = `
reports:
  月末レポート:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: MONTH
        dayOfMonth: END_OF_MONTH
        time: "09:00"
`;
      const config = ReportConfigParser.parse(yaml);
      const report = config.reports.月末レポート;
      expect(report.periodicReport?.period.dayOfMonth).toBe("END_OF_MONTH");
    });

    it("should throw for invalid dayOfWeek", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: WEEK
        dayOfWeek: INVALID_DAY
        time: "09:00"
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should parse valid dayOfWeek values", () => {
      const days = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ];
      for (const day of days) {
        const yaml = `
reports:
  テスト:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: WEEK
        dayOfWeek: ${day}
        time: "09:00"
`;
        const config = ReportConfigParser.parse(yaml);
        expect(config.reports.テスト.periodicReport?.period.dayOfWeek).toBe(
          day,
        );
      }
    });

    it("should parse report without chartMode (PIE)", () => {
      const yaml = `
reports:
  テスト:
    chartType: PIE
    index: 0
    groups:
      - code: 担当者
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.テスト.chartType).toBe("PIE");
      expect(config.reports.テスト.chartMode).toBeUndefined();
    });

    it("should parse report without chartMode (TABLE)", () => {
      const yaml = `
reports:
  テスト:
    chartType: TABLE
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.テスト.chartType).toBe("TABLE");
      expect(config.reports.テスト.chartMode).toBeUndefined();
    });

    it("should parse periodicReport with minute", () => {
      const yaml = `
reports:
  時間レポート:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: HOUR
        minute: 30
`;
      const config = ReportConfigParser.parse(yaml);
      const report = config.reports.時間レポート;
      expect(report.periodicReport?.period.minute).toBe(30);
    });

    it("should throw for non-boolean periodicReport.active", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: "yes"
      period:
        every: MONTH
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object periodicReport", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport: not_an_object
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object periodicReport.period", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period: not_an_object
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for invalid periodicReport.period.every", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: INVALID
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object group", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups:
      - not_an_object
    aggregations: []
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for group with empty code", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups:
      - code: ""
    aggregations: []
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object aggregation", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations:
      - not_an_object
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for aggregation with non-string code", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations:
      - type: SUM
        code: 123
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object sort", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts:
      - not_an_object
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object report", () => {
      const yaml = `
reports:
  テスト: not_an_object
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should default filterCond to empty string when not provided", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations: []
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.テスト.filterCond).toBe("");
    });

    it("should default groups, aggregations, sorts to empty arrays when not arrays", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    filterCond: ""
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.テスト.groups).toEqual([]);
      expect(config.reports.テスト.aggregations).toEqual([]);
      expect(config.reports.テスト.sorts).toEqual([]);
    });

    it("should parse all periodic every values", () => {
      const everyValues = ["YEAR", "QUARTER", "MONTH", "WEEK", "DAY", "HOUR"];
      for (const every of everyValues) {
        const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: ${every}
`;
        const config = ReportConfigParser.parse(yaml);
        expect(config.reports.テスト.periodicReport?.period.every).toBe(every);
      }
    });

    it("should parse all aggregation types", () => {
      const aggregationTypes = ["COUNT", "SUM", "AVERAGE", "MAX", "MIN"];
      for (const aggType of aggregationTypes) {
        const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations:
      - type: ${aggType}
    filterCond: ""
    sorts: []
`;
        const config = ReportConfigParser.parse(yaml);
        expect(config.reports.テスト.aggregations[0].type).toBe(aggType);
      }
    });

    it("should parse periodicReport with minute", () => {
      const yaml = `
reports:
  時間レポート:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: HOUR
        minute: 30
`;
      const config = ReportConfigParser.parse(yaml);
      const report = config.reports.時間レポート;
      expect(report.periodicReport?.period.minute).toBe(30);
    });

    it("should throw for non-boolean periodicReport.active", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: "yes"
      period:
        every: MONTH
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object periodicReport", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport: not_an_object
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object periodicReport.period", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period: not_an_object
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for invalid periodicReport.period.every", () => {
      const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: INVALID
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object group", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups:
      - not_an_object
    aggregations: []
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for group with empty code", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups:
      - code: ""
    aggregations: []
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object aggregation", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations:
      - not_an_object
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for aggregation with non-string code", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations:
      - type: SUM
        code: 123
    filterCond: ""
    sorts: []
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object sort", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations: []
    filterCond: ""
    sorts:
      - not_an_object
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should throw for non-object report", () => {
      const yaml = `
reports:
  テスト: not_an_object
`;
      expect(() => ReportConfigParser.parse(yaml)).toThrow(BusinessRuleError);
    });

    it("should default filterCond to empty string when not provided", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations: []
    sorts: []
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.テスト.filterCond).toBe("");
    });

    it("should default groups, aggregations, sorts to empty arrays when not arrays", () => {
      const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    filterCond: ""
`;
      const config = ReportConfigParser.parse(yaml);
      expect(config.reports.テスト.groups).toEqual([]);
      expect(config.reports.テスト.aggregations).toEqual([]);
      expect(config.reports.テスト.sorts).toEqual([]);
    });

    it("should parse all periodic every values", () => {
      const everyValues = ["YEAR", "QUARTER", "MONTH", "WEEK", "DAY", "HOUR"];
      for (const every of everyValues) {
        const yaml = `
reports:
  テスト:
    chartType: COLUMN
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
    periodicReport:
      active: true
      period:
        every: ${every}
`;
        const config = ReportConfigParser.parse(yaml);
        expect(config.reports.テスト.periodicReport?.period.every).toBe(every);
      }
    });

    it("should parse all aggregation types", () => {
      const aggregationTypes = ["COUNT", "SUM", "AVERAGE", "MAX", "MIN"];
      for (const aggType of aggregationTypes) {
        const yaml = `
reports:
  テスト:
    chartType: BAR
    index: 0
    groups: []
    aggregations:
      - type: ${aggType}
    filterCond: ""
    sorts: []
`;
        const config = ReportConfigParser.parse(yaml);
        expect(config.reports.テスト.aggregations[0].type).toBe(aggType);
      }
    });
  });
});
