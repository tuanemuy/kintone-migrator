import { describe, expect, it } from "vitest";
import { setupTestReportContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureReport } from "../captureReport";

describe("captureReport", () => {
  const getContainer = setupTestReportContainer();

  describe("success cases", () => {
    it("should capture reports and serialize to YAML", async () => {
      const container = getContainer();
      container.reportConfigurator.setReports({
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
      });

      const result = await captureReport({ container });

      expect(result.configText).toContain("月次タスク集計");
      expect(result.configText).toContain("COLUMN");
      expect(result.configText).toContain("作成日時");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.reportConfigurator.setReports({});
      container.reportStorage.setContent("existing content");

      const result = await captureReport({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.reportConfigurator.setReports({});

      const result = await captureReport({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getReports() fails", async () => {
      const container = getContainer();
      container.reportConfigurator.setFailOn("getReports");

      await expect(captureReport({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when reportStorage.get() fails", async () => {
      const container = getContainer();
      container.reportStorage.setFailOn("get");

      await expect(captureReport({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
