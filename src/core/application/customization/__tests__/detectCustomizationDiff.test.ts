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

const BASE_PATH = "/test/base";

describe("detectCustomizationDiff", () => {
  const getContainer = setupTestCustomizationContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match and file content is identical", async () => {
      const container = getContainer();
      const sameContent = new TextEncoder().encode("same content").buffer;

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

      // Set same content for local file and remote file
      container.fileContentReader.setFile(
        "/test/base/dist/main.js",
        sameContent,
      );
      container.fileDownloader.setFile("fk-1", sameContent);

      const result = await detectCustomizationDiff({
        container,
        input: { basePath: BASE_PATH },
      });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect modified entry when file content differs", async () => {
      const container = getContainer();
      const localContent = new TextEncoder().encode("new content").buffer;
      const remoteContent = new TextEncoder().encode("old content").buffer;

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

      container.fileContentReader.setFile(
        "/test/base/dist/main.js",
        localContent,
      );
      container.fileDownloader.setFile("fk-1", remoteContent);

      const result = await detectCustomizationDiff({
        container,
        input: { basePath: BASE_PATH },
      });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.modified).toBe(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toBe("file content changed");
    });

    it("should not download files for URL-only resources", async () => {
      const container = getContainer();
      const urlConfig = `
scope: ALL
desktop:
  js:
    - type: URL
      url: https://example.com/app.js
  css: []
`;
      container.customizationStorage.setContent(urlConfig);
      container.customizationConfigurator.setCustomization({
        scope: "ALL",
        desktop: {
          js: [{ type: "URL", url: "https://example.com/app.js" }],
          css: [],
        },
        mobile: { js: [], css: [] },
        revision: "1",
      });

      const result = await detectCustomizationDiff({
        container,
        input: { basePath: BASE_PATH },
      });

      expect(result.isEmpty).toBe(true);
      // No download should have been triggered
      expect(container.fileDownloader.callLog).toHaveLength(0);
      expect(container.fileContentReader.callLog).toHaveLength(0);
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

      const result = await detectCustomizationDiff({
        container,
        input: { basePath: BASE_PATH },
      });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.added).toBe(1);
      expect(result.summary.total).toBe(1);
    });

    it("should detect deleted customization resource", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(`
scope: ALL
desktop:
  js: []
  css: []
`);
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

      const result = await detectCustomizationDiff({
        container,
        input: { basePath: BASE_PATH },
      });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.deleted).toBe(1);
      expect(result.entries[0].type).toBe("deleted");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(
        detectCustomizationDiff({
          container,
          input: { basePath: BASE_PATH },
        }),
      ).rejects.toSatisfy(isValidationError);
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.customizationStorage.setFailOn("get");

      await expect(
        detectCustomizationDiff({
          container,
          input: { basePath: BASE_PATH },
        }),
      ).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG);
      container.customizationConfigurator.setFailOn("getCustomization");

      await expect(
        detectCustomizationDiff({
          container,
          input: { basePath: BASE_PATH },
        }),
      ).rejects.toSatisfy(isSystemError);
    });

    it("should throw ValidationError when config has invalid YAML", async () => {
      const container = getContainer();
      container.customizationStorage.setContent("{{invalid yaml");

      await expect(
        detectCustomizationDiff({
          container,
          input: { basePath: BASE_PATH },
        }),
      ).rejects.toSatisfy(isValidationError);
    });
  });
});
