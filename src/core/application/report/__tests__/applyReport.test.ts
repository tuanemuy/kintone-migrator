import { describe, expect, it } from "vitest";
import { setupTestReportContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyReport } from "../applyReport";

const VALID_CONFIG = `
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
    filterCond: ""
    sorts: []
`;

describe("applyReport", () => {
  const getContainer = setupTestReportContainer();

  describe("success cases", () => {
    it("should read config and update reports", async () => {
      const container = getContainer();
      container.reportStorage.setContent(VALID_CONFIG);

      await applyReport({ container });

      expect(container.reportConfigurator.callLog).toEqual([
        "getReports",
        "updateReports",
      ]);
      expect(
        Object.keys(
          container.reportConfigurator.lastUpdateParams?.reports ?? {},
        ),
      ).toHaveLength(2);
      expect(
        container.reportConfigurator.lastUpdateParams?.reports.月次タスク集計
          .chartType,
      ).toBe("COLUMN");
      expect(container.reportConfigurator.lastUpdateParams?.revision).toBe("1");
    });

    it("should pass revision from current reports", async () => {
      const container = getContainer();
      container.reportStorage.setContent(VALID_CONFIG);
      container.reportConfigurator.setReports({}, "42");

      await applyReport({ container });

      expect(container.reportConfigurator.lastUpdateParams?.revision).toBe(
        "42",
      );
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(applyReport({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for empty config", async () => {
      const container = getContainer();
      container.reportStorage.setContent("");

      await expect(applyReport({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.reportStorage.setContent("{ invalid: yaml:");

      await expect(applyReport({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when reportStorage.get() fails", async () => {
      const container = getContainer();
      container.reportStorage.setFailOn("get");

      await expect(applyReport({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when getReports() fails", async () => {
      const container = getContainer();
      container.reportStorage.setContent(VALID_CONFIG);
      container.reportConfigurator.setFailOn("getReports");

      await expect(applyReport({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when updateReports() fails", async () => {
      const container = getContainer();
      container.reportStorage.setContent(VALID_CONFIG);
      container.reportConfigurator.setFailOn("updateReports");

      await expect(applyReport({ container })).rejects.toSatisfy(isSystemError);
    });
  });
});
