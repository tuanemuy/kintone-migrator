import { describe, expect, it } from "vitest";
import type { ReportsConfig } from "../../entity";
import { ReportConfigParser } from "../configParser";
import { ReportConfigSerializer } from "../configSerializer";

describe("ReportConfigSerializer", () => {
  describe("serialize", () => {
    it("should serialize config with multiple reports", () => {
      const config: ReportsConfig = {
        reports: {
          月次タスク集計: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            name: "月次タスク集計",
            groups: [{ code: "作成日時", per: "MONTH" }],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [{ by: "GROUP1", order: "ASC" }],
          },
          担当者別タスク数: {
            chartType: "PIE",
            chartMode: "NORMAL",
            index: 1,
            name: "担当者別タスク数",
            groups: [{ code: "担当者" }],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
          },
        },
      };

      const yaml = ReportConfigSerializer.serialize(config);

      expect(yaml).toContain("月次タスク集計");
      expect(yaml).toContain("COLUMN");
      expect(yaml).toContain("作成日時");
      expect(yaml).toContain("MONTH");
      expect(yaml).toContain("担当者別タスク数");
      expect(yaml).toContain("PIE");
    });

    it("should serialize config with periodicReport", () => {
      const config: ReportsConfig = {
        reports: {
          定期レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            name: "定期レポート",
            groups: [],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
            periodicReport: {
              active: true,
              period: {
                every: "MONTH",
                dayOfMonth: 1,
                time: "08:00",
              },
            },
          },
        },
      };

      const yaml = ReportConfigSerializer.serialize(config);

      expect(yaml).toContain("periodicReport");
      expect(yaml).toContain("active: true");
      expect(yaml).toContain("every: MONTH");
      expect(yaml).toContain("dayOfMonth: 1");
      expect(yaml).toContain("time: 08:00");
    });

    it("should not include name property in serialized output", () => {
      const config: ReportsConfig = {
        reports: {
          テスト: {
            chartType: "BAR",
            chartMode: "NORMAL",
            index: 0,
            name: "テスト",
            groups: [],
            aggregations: [],
            filterCond: "",
            sorts: [],
          },
        },
      };

      const yaml = ReportConfigSerializer.serialize(config);
      const lines = yaml.split("\n").map((l) => l.trim());
      expect(lines.filter((l) => l.startsWith("name:"))).toHaveLength(0);
    });

    it("should serialize config with aggregation code", () => {
      const config: ReportsConfig = {
        reports: {
          テスト: {
            chartType: "BAR",
            chartMode: "NORMAL",
            index: 0,
            name: "テスト",
            groups: [],
            aggregations: [{ type: "SUM", code: "金額" }],
            filterCond: "",
            sorts: [],
          },
        },
      };

      const yaml = ReportConfigSerializer.serialize(config);

      expect(yaml).toContain("type: SUM");
      expect(yaml).toContain("code: 金額");
    });

    it("should serialize config with group per", () => {
      const config: ReportsConfig = {
        reports: {
          テスト: {
            chartType: "BAR",
            chartMode: "NORMAL",
            index: 0,
            name: "テスト",
            groups: [{ code: "日付", per: "MONTH" }],
            aggregations: [],
            filterCond: "",
            sorts: [],
          },
        },
      };

      const yaml = ReportConfigSerializer.serialize(config);

      expect(yaml).toContain("per: MONTH");
    });

    it("should serialize empty reports", () => {
      const config: ReportsConfig = {
        reports: {},
      };

      const yaml = ReportConfigSerializer.serialize(config);

      expect(yaml).toContain("reports: {}");
    });

    it("should serialize config with periodicReport month and pattern", () => {
      const config: ReportsConfig = {
        reports: {
          年次レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            name: "年次レポート",
            groups: [],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
            periodicReport: {
              active: true,
              period: {
                every: "YEAR",
                month: 4,
                dayOfMonth: 1,
                time: "09:00",
              },
            },
          },
          四半期レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 1,
            name: "四半期レポート",
            groups: [],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
            periodicReport: {
              active: true,
              period: {
                every: "QUARTER",
                pattern: "JAN_APR_JUL_OCT",
                dayOfMonth: 1,
                time: "09:00",
              },
            },
          },
        },
      };

      const yaml = ReportConfigSerializer.serialize(config);

      expect(yaml).toContain("month: 4");
      expect(yaml).toContain("pattern: JAN_APR_JUL_OCT");
    });

    it("should serialize dayOfMonth with END_OF_MONTH", () => {
      const config: ReportsConfig = {
        reports: {
          月末レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            name: "月末レポート",
            groups: [],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
            periodicReport: {
              active: true,
              period: {
                every: "MONTH",
                dayOfMonth: "END_OF_MONTH",
                time: "09:00",
              },
            },
          },
        },
      };

      const yaml = ReportConfigSerializer.serialize(config);

      expect(yaml).toContain("dayOfMonth: END_OF_MONTH");
    });

    it("should serialize config without chartMode", () => {
      const config: ReportsConfig = {
        reports: {
          テスト: {
            chartType: "PIE",
            index: 0,
            name: "テスト",
            groups: [{ code: "担当者" }],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
          },
        },
      };

      const yaml = ReportConfigSerializer.serialize(config);

      expect(yaml).toContain("chartType: PIE");
      expect(yaml).not.toContain("chartMode");
    });

    it("should roundtrip parse and serialize", () => {
      const originalYaml = `
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
    periodicReport:
      active: true
      period:
        every: MONTH
        dayOfMonth: 1
        time: "08:00"
  担当者別タスク数:
    chartType: PIE
    chartMode: NORMAL
    index: 1
    groups:
      - code: 担当者
    aggregations:
      - type: SUM
        code: 工数
    filterCond: ""
    sorts:
      - by: TOTAL
        order: DESC
`;
      const parsed = ReportConfigParser.parse(originalYaml);
      const serialized = ReportConfigSerializer.serialize(parsed);
      const reparsed = ReportConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
