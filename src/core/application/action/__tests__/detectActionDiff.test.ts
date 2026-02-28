import { describe, expect, it } from "vitest";
import { setupTestActionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectActionDiff } from "../detectActionDiff";

const VALID_CONFIG = `
actions:
  test:
    index: 0
    destApp:
      code: target-app
    mappings:
      - srcType: FIELD
        srcField: src
        destField: dest
    entities:
      - type: USER
        code: user1
`;

describe("detectActionDiff", () => {
  const getContainer = setupTestActionContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.actionStorage.setContent(VALID_CONFIG);
      container.actionConfigurator.setActions({
        test: {
          index: 0,
          name: "test",
          destApp: { code: "target-app" },
          mappings: [{ srcType: "FIELD", srcField: "src", destField: "dest" }],
          entities: [{ type: "USER", code: "user1" }],
          filterCond: "",
        },
      });

      const result = await detectActionDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.actionStorage.setContent(VALID_CONFIG);
      container.actionConfigurator.setActions({});

      const result = await detectActionDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.added).toBe(1);
      expect(result.entries[0].type).toBe("added");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectActionDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.actionStorage.setFailOn("get");

      await expect(detectActionDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.actionStorage.setContent(VALID_CONFIG);
      container.actionConfigurator.setFailOn("getActions");

      await expect(detectActionDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw ValidationError when config has invalid YAML", async () => {
      const container = getContainer();
      container.actionStorage.setContent("{{invalid yaml");

      await expect(detectActionDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });
  });
});
