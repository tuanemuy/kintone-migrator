import { describe, expect, it } from "vitest";
import { setupTestViewContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectViewDiff } from "../detectViewDiff";

const VALID_CONFIG = `
views:
  一覧:
    type: LIST
    index: 0
    fields:
      - field1
`;

describe("detectViewDiff", () => {
  const getContainer = setupTestViewContainer();

  describe("success cases", () => {
    it("should detect no changes when views match", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      container.viewConfigurator.setViews({
        一覧: {
          type: "LIST",
          index: 0,
          name: "一覧",
          fields: ["field1"],
        },
      });

      const result = await detectViewDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect added views", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      container.viewConfigurator.setViews({});

      const result = await detectViewDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.added).toBe(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].viewName).toBe("一覧");
    });

    it("should detect deleted views", async () => {
      const container = getContainer();
      container.viewStorage.setContent(`
views:
  一覧:
    type: LIST
    index: 0
`);
      container.viewConfigurator.setViews({
        一覧: { type: "LIST", index: 0, name: "一覧" },
        extra: { type: "CUSTOM", index: 1, name: "extra" },
      });

      const result = await detectViewDiff({ container });

      expect(result.summary.deleted).toBe(1);
    });

    it("should detect modified views", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      container.viewConfigurator.setViews({
        一覧: {
          type: "LIST",
          index: 0,
          name: "一覧",
          fields: ["field1", "field2"],
        },
      });

      const result = await detectViewDiff({ container });

      expect(result.summary.modified).toBe(1);
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectViewDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when getViews() fails", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      container.viewConfigurator.setFailOn("getViews");

      await expect(detectViewDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when viewStorage.get() fails", async () => {
      const container = getContainer();
      container.viewStorage.setFailOn("get");

      await expect(detectViewDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
