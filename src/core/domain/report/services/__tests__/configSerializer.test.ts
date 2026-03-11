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

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;

      expect(reports).toHaveProperty("月次タスク集計");
      expect(reports["月次タスク集計"].chartType).toBe("COLUMN");
      const groups0 = reports["月次タスク集計"].groups as Record<
        string,
        unknown
      >[];
      expect(groups0[0].code).toBe("作成日時");
      expect(groups0[0].per).toBe("MONTH");

      expect(reports).toHaveProperty("担当者別タスク数");
      expect(reports["担当者別タスク数"].chartType).toBe("PIE");
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

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;
      const report = reports["定期レポート"];

      expect(report).toHaveProperty("periodicReport");
      const periodicReport = report.periodicReport as Record<string, unknown>;
      expect(periodicReport.active).toBe(true);

      const period = periodicReport.period as Record<string, unknown>;
      expect(period.every).toBe("MONTH");
      expect(period.dayOfMonth).toBe(1);
      expect(period.time).toBe("08:00");
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

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;
      const report = reports["テスト"];

      expect(report).not.toHaveProperty("name");
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

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;
      const aggregations = reports["テスト"].aggregations as Record<
        string,
        unknown
      >[];

      expect(aggregations[0].type).toBe("SUM");
      expect(aggregations[0].code).toBe("金額");
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

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;
      const groups = reports["テスト"].groups as Record<string, unknown>[];

      expect(groups[0].per).toBe("MONTH");
    });

    it("should serialize empty reports", () => {
      const config: ReportsConfig = {
        reports: {},
      };

      const result = ReportConfigSerializer.serialize(config);

      expect(result.reports).toEqual({});
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

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;

      const yearReport = reports["年次レポート"];
      const yearPeriod = (yearReport.periodicReport as Record<string, unknown>)
        .period as Record<string, unknown>;
      expect(yearPeriod.month).toBe(4);

      const quarterReport = reports["四半期レポート"];
      const quarterPeriod = (
        quarterReport.periodicReport as Record<string, unknown>
      ).period as Record<string, unknown>;
      expect(quarterPeriod.pattern).toBe("JAN_APR_JUL_OCT");
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

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;
      const period = (
        reports["月末レポート"].periodicReport as Record<string, unknown>
      ).period as Record<string, unknown>;

      expect(period.dayOfMonth).toBe("END_OF_MONTH");
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

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;
      const report = reports["テスト"];

      expect(report.chartType).toBe("PIE");
      expect(report).not.toHaveProperty("chartMode");
    });

    it("should serialize periodicReport with dayOfWeek", () => {
      const config: ReportsConfig = {
        reports: {
          週次レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            name: "週次レポート",
            groups: [],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
            periodicReport: {
              active: true,
              period: {
                every: "WEEK",
                dayOfWeek: "MONDAY",
                time: "09:00",
              },
            },
          },
        },
      };

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;
      const period = (
        reports["週次レポート"].periodicReport as Record<string, unknown>
      ).period as Record<string, unknown>;

      expect(period.dayOfWeek).toBe("MONDAY");
    });

    it("should serialize periodicReport with minute", () => {
      const config: ReportsConfig = {
        reports: {
          時間レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            name: "時間レポート",
            groups: [],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
            periodicReport: {
              active: true,
              period: {
                every: "HOUR",
                minute: 30,
              },
            },
          },
        },
      };

      const result = ReportConfigSerializer.serialize(config);
      const reports = result.reports as Record<string, Record<string, unknown>>;
      const period = (
        reports["時間レポート"].periodicReport as Record<string, unknown>
      ).period as Record<string, unknown>;

      expect(period.minute).toBe(30);
    });

    it("should roundtrip parse and serialize", () => {
      const input = {
        reports: {
          月次タスク集計: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            groups: [{ code: "作成日時", per: "MONTH" }],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [{ by: "GROUP1", order: "ASC" }],
            periodicReport: {
              active: true,
              period: {
                every: "MONTH",
                dayOfMonth: 1,
                time: "08:00",
              },
            },
          },
          担当者別タスク数: {
            chartType: "PIE",
            chartMode: "NORMAL",
            index: 1,
            groups: [{ code: "担当者" }],
            aggregations: [{ type: "SUM", code: "工数" }],
            filterCond: "",
            sorts: [{ by: "TOTAL", order: "DESC" }],
          },
        },
      };
      const parsed = ReportConfigParser.parse(input);
      const serialized = ReportConfigSerializer.serialize(parsed);
      const reparsed = ReportConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
