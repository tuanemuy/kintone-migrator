import { describe, expect, it } from "vitest";
import { setupTestReportContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectReportDiff } from "../detectReportDiff";

const VALID_CONFIG = `
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

describe("detectReportDiff", () => {
  const getContainer = setupTestReportContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.reportStorage.setContent(VALID_CONFIG);
      container.reportConfigurator.setReports({
        テスト: {
          chartType: "BAR",
          chartMode: "NORMAL",
          index: 0,
          name: "テスト",
          groups: [{ code: "担当者" }],
          aggregations: [{ type: "COUNT" }],
          filterCond: "",
          sorts: [],
        },
      });

      const result = await detectReportDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.reportStorage.setContent(VALID_CONFIG);
      container.reportConfigurator.setReports({});

      const result = await detectReportDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.added).toBe(1);
      expect(result.entries[0].type).toBe("added");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectReportDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.reportStorage.setFailOn("get");

      await expect(detectReportDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.reportStorage.setContent(VALID_CONFIG);
      container.reportConfigurator.setFailOn("getReports");

      await expect(detectReportDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw ValidationError when config has invalid YAML", async () => {
      const container = getContainer();
      container.reportStorage.setContent("{{invalid yaml");

      await expect(detectReportDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });
  });
});
