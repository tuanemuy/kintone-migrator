import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { ReportErrorCode } from "../../errorCode";
import { ReportConfigParser } from "../configParser";

describe("ReportConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple reports", () => {
      const config = ReportConfigParser.parse({
        reports: {
          月次タスク集計: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            groups: [{ code: "作成日時", per: "MONTH" }],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [{ by: "GROUP1", order: "ASC" }],
          },
          担当者別タスク数: {
            chartType: "PIE",
            chartMode: "NORMAL",
            index: 1,
            groups: [{ code: "担当者" }],
            aggregations: [{ type: "COUNT" }],
            filterCond: 'ステータス not in ("完了")',
          },
        },
      });

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
      const config = ReportConfigParser.parse({
        reports: {
          テストレポート: {
            chartType: "BAR",
            chartMode: "NORMAL",
            index: 0,
            groups: [],
            aggregations: [],
            filterCond: "",
            sorts: [],
          },
        },
      });
      expect(config.reports.テストレポート.name).toBe("テストレポート");
    });

    it("should prefer explicit name property over map key", () => {
      const config = ReportConfigParser.parse({
        reports: {
          キー名: {
            chartType: "BAR",
            chartMode: "NORMAL",
            name: "明示的な名前",
            index: 0,
            groups: [],
            aggregations: [],
            filterCond: "",
            sorts: [],
          },
        },
      });
      expect(config.reports.キー名.name).toBe("明示的な名前");
    });

    it("should parse config with periodicReport", () => {
      const config = ReportConfigParser.parse({
        reports: {
          定期レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
            groups: [{ code: "作成日時", per: "MONTH" }],
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
      });
      const report = config.reports.定期レポート;

      expect(report.periodicReport).toBeDefined();
      expect(report.periodicReport?.active).toBe(true);
      expect(report.periodicReport?.period.every).toBe("MONTH");
      expect(report.periodicReport?.period.dayOfMonth).toBe(1);
      expect(report.periodicReport?.period.time).toBe("08:00");
    });

    it("should parse config without periodicReport", () => {
      const config = ReportConfigParser.parse({
        reports: {
          シンプルレポート: {
            chartType: "BAR",
            chartMode: "NORMAL",
            index: 0,
            groups: [],
            aggregations: [],
            filterCond: "",
            sorts: [],
          },
        },
      });
      expect(config.reports.シンプルレポート.periodicReport).toBeUndefined();
    });

    it("should parse aggregation with code", () => {
      const config = ReportConfigParser.parse({
        reports: {
          集計レポート: {
            chartType: "BAR",
            chartMode: "NORMAL",
            index: 0,
            groups: [{ code: "カテゴリ" }],
            aggregations: [{ type: "SUM", code: "金額" }],
            filterCond: "",
            sorts: [],
          },
        },
      });
      expect(config.reports.集計レポート.aggregations[0]).toEqual({
        type: "SUM",
        code: "金額",
      });
    });

    it("should parse group without per", () => {
      const config = ReportConfigParser.parse({
        reports: {
          グループレポート: {
            chartType: "BAR",
            chartMode: "NORMAL",
            index: 0,
            groups: [{ code: "担当者" }],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
          },
        },
      });
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
        const config = ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType,
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        });
        expect(config.reports.テスト.chartType).toBe(chartType);
      }
    });

    it("should parse all chart modes", () => {
      const chartModes = ["NORMAL", "STACKED", "PERCENTAGE"];
      for (const chartMode of chartModes) {
        const config = ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode,
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        });
        expect(config.reports.テスト.chartMode).toBe(chartMode);
      }
    });

    it("should default index to 0 when not provided", () => {
      const config = ReportConfigParser.parse({
        reports: {
          テスト: {
            chartType: "BAR",
            chartMode: "NORMAL",
            groups: [],
            aggregations: [],
            filterCond: "",
            sorts: [],
          },
        },
      });
      expect(config.reports.テスト.index).toBe(0);
    });

    it("should throw RtInvalidConfigStructure for non-object input", () => {
      expect(() => ReportConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => ReportConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for array input", () => {
      expect(() => ReportConfigParser.parse(["item1"])).toThrow(
        BusinessRuleError,
      );
      expect(() => ReportConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for null input", () => {
      expect(() => ReportConfigParser.parse(null)).toThrow(BusinessRuleError);
      expect(() => ReportConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure when reports is missing", () => {
      expect(() => ReportConfigParser.parse({ someOtherKey: "value" })).toThrow(
        BusinessRuleError,
      );
      expect(() => ReportConfigParser.parse({ someOtherKey: "value" })).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidChartType for invalid chart type", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "INVALID",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "INVALID",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidChartType,
        }),
      );
    });

    it("should throw RtInvalidChartMode for invalid chart mode", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "INVALID",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "INVALID",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidChartMode,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for invalid group per", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [{ code: "フィールド", per: "INVALID" }],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [{ code: "フィールド", per: "INVALID" }],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for invalid aggregation type", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [{ type: "INVALID" }],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [{ type: "INVALID" }],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for invalid sort by", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [{ by: "INVALID", order: "ASC" }],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [{ by: "INVALID", order: "ASC" }],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw RtInvalidConfigStructure for invalid sort order", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [{ by: "GROUP1", order: "INVALID" }],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [{ by: "GROUP1", order: "INVALID" }],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should parse empty reports object", () => {
      const config = ReportConfigParser.parse({ reports: {} });
      expect(Object.keys(config.reports)).toHaveLength(0);
    });

    it("should parse all valid sort by values", () => {
      const sortByValues = ["TOTAL", "GROUP1", "GROUP2", "GROUP3"];
      for (const sortBy of sortByValues) {
        const config = ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [{ by: sortBy, order: "ASC" }],
            },
          },
        });
        expect(config.reports.テスト.sorts[0].by).toBe(sortBy);
      }
    });

    it("should reject old GROUP sort by value", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: [{ by: "GROUP", order: "ASC" }],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should parse periodicReport with month", () => {
      const config = ReportConfigParser.parse({
        reports: {
          年次レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
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
        },
      });
      const report = config.reports.年次レポート;
      expect(report.periodicReport?.period.month).toBe(4);
    });

    it("should parse periodicReport with pattern for QUARTER", () => {
      const config = ReportConfigParser.parse({
        reports: {
          四半期レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
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
      });
      const report = config.reports.四半期レポート;
      expect(report.periodicReport?.period.pattern).toBe("JAN_APR_JUL_OCT");
    });

    it("should throw for invalid periodicReport pattern", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: {
                  every: "QUARTER",
                  pattern: "INVALID_PATTERN",
                  dayOfMonth: 1,
                  time: "09:00",
                },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should parse dayOfMonth with END_OF_MONTH", () => {
      const config = ReportConfigParser.parse({
        reports: {
          月末レポート: {
            chartType: "COLUMN",
            chartMode: "NORMAL",
            index: 0,
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
      });
      const report = config.reports.月末レポート;
      expect(report.periodicReport?.period.dayOfMonth).toBe("END_OF_MONTH");
    });

    it("should throw for invalid dayOfWeek", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: {
                  every: "WEEK",
                  dayOfWeek: "INVALID_DAY",
                  time: "09:00",
                },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
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
        const config = ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              chartMode: "NORMAL",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: {
                  every: "WEEK",
                  dayOfWeek: day,
                  time: "09:00",
                },
              },
            },
          },
        });
        expect(config.reports.テスト.periodicReport?.period.dayOfWeek).toBe(
          day,
        );
      }
    });

    it("should parse report without chartMode (PIE)", () => {
      const config = ReportConfigParser.parse({
        reports: {
          テスト: {
            chartType: "PIE",
            index: 0,
            groups: [{ code: "担当者" }],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
          },
        },
      });
      expect(config.reports.テスト.chartType).toBe("PIE");
      expect(config.reports.テスト.chartMode).toBeUndefined();
    });

    it("should parse report without chartMode (TABLE)", () => {
      const config = ReportConfigParser.parse({
        reports: {
          テスト: {
            chartType: "TABLE",
            index: 0,
            groups: [],
            aggregations: [{ type: "COUNT" }],
            filterCond: "",
            sorts: [],
          },
        },
      });
      expect(config.reports.テスト.chartType).toBe("TABLE");
      expect(config.reports.テスト.chartMode).toBeUndefined();
    });

    it("should parse periodicReport with minute", () => {
      const config = ReportConfigParser.parse({
        reports: {
          時間レポート: {
            chartType: "COLUMN",
            index: 0,
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
      });
      const report = config.reports.時間レポート;
      expect(report.periodicReport?.period.minute).toBe(30);
    });

    it("should throw for non-boolean periodicReport.active", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: "yes",
                period: { every: "MONTH" },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for non-object periodicReport", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: "not_an_object",
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for non-object periodicReport.period", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: "not_an_object",
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for invalid periodicReport.period.every", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "INVALID" },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for non-object group", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: 0,
              groups: ["not_an_object"],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for group with empty code", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: 0,
              groups: [{ code: "" }],
              aggregations: [],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for non-object aggregation", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: 0,
              groups: [],
              aggregations: ["not_an_object"],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for aggregation with non-string code", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: 0,
              groups: [],
              aggregations: [{ type: "SUM", code: 123 }],
              filterCond: "",
              sorts: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for non-object sort", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: 0,
              groups: [],
              aggregations: [],
              filterCond: "",
              sorts: ["not_an_object"],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for non-object report", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: "not_an_object",
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should default filterCond to empty string when not provided", () => {
      const config = ReportConfigParser.parse({
        reports: {
          テスト: {
            chartType: "BAR",
            index: 0,
            groups: [],
            aggregations: [],
            sorts: [],
          },
        },
      });
      expect(config.reports.テスト.filterCond).toBe("");
    });

    it("should default groups, aggregations, sorts to empty arrays when not arrays", () => {
      const config = ReportConfigParser.parse({
        reports: {
          テスト: {
            chartType: "BAR",
            index: 0,
            filterCond: "",
          },
        },
      });
      expect(config.reports.テスト.groups).toEqual([]);
      expect(config.reports.テスト.aggregations).toEqual([]);
      expect(config.reports.テスト.sorts).toEqual([]);
    });

    it("should parse all periodic every values", () => {
      const everyValues = ["YEAR", "QUARTER", "MONTH", "WEEK", "DAY", "HOUR"];
      for (const every of everyValues) {
        const config = ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every },
              },
            },
          },
        });
        expect(config.reports.テスト.periodicReport?.period.every).toBe(every);
      }
    });

    it("should parse all aggregation types", () => {
      const aggregationTypes = ["COUNT", "SUM", "AVERAGE", "MAX", "MIN"];
      for (const aggType of aggregationTypes) {
        const config = ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: 0,
              groups: [],
              aggregations: [{ type: aggType }],
              filterCond: "",
              sorts: [],
            },
          },
        });
        expect(config.reports.テスト.aggregations[0].type).toBe(aggType);
      }
    });

    it("should throw for non-numeric index", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: "not_a_number",
              filterCond: "",
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for out-of-range month (0)", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "YEAR", month: 0 },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for out-of-range month (13)", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "YEAR", month: 13 },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for out-of-range minute (60)", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "HOUR", minute: 60 },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for out-of-range dayOfMonth (0)", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "MONTH", dayOfMonth: 0 },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for out-of-range dayOfMonth (32)", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "MONTH", dayOfMonth: 32 },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should accept valid month range boundaries (1 and 12)", () => {
      for (const month of [1, 12]) {
        const config = ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "YEAR", month },
              },
            },
          },
        });
        expect(config.reports.テスト.periodicReport?.period.month).toBe(month);
      }
    });

    it("should throw for fractional month", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "YEAR", month: 1.5 },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for minute that is not a multiple of 10", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "COLUMN",
              index: 0,
              groups: [],
              aggregations: [{ type: "COUNT" }],
              filterCond: "",
              sorts: [],
              periodicReport: {
                active: true,
                period: { every: "HOUR", minute: 15 },
              },
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for negative index", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: -1,
              filterCond: "",
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for fractional index", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              index: 1.5,
              filterCond: "",
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for non-array groups", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              groups: "not_an_array",
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-array aggregations", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              aggregations: "not_an_array",
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-array sorts", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              sorts: "not_an_array",
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw for fractional dayOfMonth", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            テスト: {
              chartType: "BAR",
              periodicReport: {
                active: true,
                period: { every: "MONTH", dayOfMonth: 1.5 },
              },
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtInvalidConfigStructure,
        }),
      );
    });

    it("should throw for empty report name", () => {
      expect(() =>
        ReportConfigParser.parse({
          reports: {
            "": { chartType: "BAR" },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ReportErrorCode.RtEmptyReportName,
        }),
      );
    });
  });
});
