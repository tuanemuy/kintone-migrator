import { describe, expect, it } from "vitest";
import { setupTestCustomizationContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectCustomizationDiff } from "../detectCustomizationDiff";

const VALID_CONFIG = `
scope: ALL
desktop:
  js:
    - type: FILE
      path: ./dist/main.js
  css: []
`;

describe("detectCustomizationDiff", () => {
  const getContainer = setupTestCustomizationContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG);
      container.customizationConfigurator.setCustomization({
        scope: "ALL",
        desktop: {
          js: [
            {
              type: "FILE",
              file: {
                fileKey: "fk-1",
                name: "main.js",
                contentType: "application/javascript",
                size: "100",
              },
            },
          ],
          css: [],
        },
        mobile: { js: [], css: [] },
        revision: "1",
      });

      const result = await detectCustomizationDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG);
      container.customizationConfigurator.setCustomization({
        scope: "ALL",
        desktop: { js: [], css: [] },
        mobile: { js: [], css: [] },
        revision: "1",
      });

      const result = await detectCustomizationDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectCustomizationDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.customizationStorage.setFailOn("get");

      await expect(detectCustomizationDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG);
      container.customizationConfigurator.setFailOn("getCustomization");

      await expect(detectCustomizationDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
