import { describe, expect, it, vi } from "vitest";
import { ReportConfigParser } from "@/core/domain/report/services/configParser";
import { isValidationError } from "../../error";
import { parseReportConfigText } from "../parseConfig";

describe("parseReportConfigText", () => {
  it("有効なレポート設定をパースする", () => {
    const rawText = `
reports:
  テスト:
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
    const config = parseReportConfigText(rawText);
    expect(Object.keys(config.reports)).toHaveLength(1);
    expect(config.reports.テスト.chartType).toBe("BAR");
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseReportConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseReportConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseReportConfigText("reports: not_object");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(ReportConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseReportConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
