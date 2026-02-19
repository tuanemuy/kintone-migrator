import { describe, expect, it } from "vitest";
import { ConfigParser } from "@/core/domain/customization/services/configParser";
import {
  setupTestCustomizationContainer,
  type TestCustomizationContainer,
} from "../../__tests__/helpers";
import { captureCustomization } from "../captureCustomization";

describe("captureCustomization", () => {
  const getContainer = setupTestCustomizationContainer();
  let container: TestCustomizationContainer;

  const basePath = "/project/customize";
  const filePrefix = "myapp";

  function setup(): void {
    container = getContainer();
  }

  it("should capture customization with FILE resources and download files", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-1",
              name: "app.js",
              contentType: "text/javascript",
              size: "100",
            },
          },
        ],
        css: [],
      },
      mobile: { js: [], css: [] },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath, filePrefix },
    });

    expect(result.fileResourceCount).toBe(1);
    expect(result.hasExistingConfig).toBe(false);

    const parsed = ConfigParser.parse(result.configText);
    expect(parsed.scope).toBe("ALL");
    expect(parsed.desktop.js).toHaveLength(1);
    expect(parsed.desktop.js[0]).toEqual({
      type: "FILE",
      path: "desktop/js/app.js",
    });

    expect(container.fileDownloader.callLog).toContain("download");
    expect(container.fileWriter.writtenFiles.size).toBe(1);
    expect(
      container.fileWriter.writtenFiles.has(
        "/project/customize/myapp/desktop/js/app.js",
      ),
    ).toBe(true);
  });

  it("should capture customization with URL resources without downloading", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [{ type: "URL", url: "https://example.com/script.js" }],
        css: [],
      },
      mobile: { js: [], css: [] },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath, filePrefix },
    });

    expect(result.fileResourceCount).toBe(0);
    const parsed = ConfigParser.parse(result.configText);
    expect(parsed.desktop.js).toEqual([
      { type: "URL", url: "https://example.com/script.js" },
    ]);
    expect(container.fileDownloader.callLog).toHaveLength(0);
  });

  it("should capture both desktop and mobile resources", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ADMIN",
      desktop: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-1",
              name: "desktop.js",
              contentType: "text/javascript",
              size: "100",
            },
          },
        ],
        css: [],
      },
      mobile: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-2",
              name: "mobile.js",
              contentType: "text/javascript",
              size: "50",
            },
          },
        ],
        css: [],
      },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath, filePrefix },
    });

    expect(result.fileResourceCount).toBe(2);

    const parsed = ConfigParser.parse(result.configText);
    expect(parsed.desktop.js).toEqual([
      { type: "FILE", path: "desktop/js/desktop.js" },
    ]);
    expect(parsed.mobile.js).toEqual([
      { type: "FILE", path: "mobile/js/mobile.js" },
    ]);

    expect(container.fileWriter.writtenFiles.size).toBe(2);
  });

  it("should capture mixed FILE and URL resources", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-1",
              name: "app.js",
              contentType: "text/javascript",
              size: "100",
            },
          },
          { type: "URL", url: "https://cdn.example.com/lib.js" },
        ],
        css: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-2",
              name: "style.css",
              contentType: "text/css",
              size: "50",
            },
          },
        ],
      },
      mobile: { js: [], css: [] },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath, filePrefix },
    });

    expect(result.fileResourceCount).toBe(2);

    const parsed = ConfigParser.parse(result.configText);
    expect(parsed.desktop.js).toHaveLength(2);
    expect(parsed.desktop.js[0]).toEqual({
      type: "FILE",
      path: "desktop/js/app.js",
    });
    expect(parsed.desktop.js[1]).toEqual({
      type: "URL",
      url: "https://cdn.example.com/lib.js",
    });
    expect(parsed.desktop.css).toHaveLength(1);
    expect(parsed.desktop.css[0]).toEqual({
      type: "FILE",
      path: "desktop/css/style.css",
    });
  });

  it("should detect existing config file", async () => {
    setup();
    container.customizationStorage.setContent("existing content");
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath, filePrefix },
    });

    expect(result.hasExistingConfig).toBe(true);
  });

  it("should handle empty customization", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath, filePrefix },
    });

    expect(result.fileResourceCount).toBe(0);
    const parsed = ConfigParser.parse(result.configText);
    expect(parsed.desktop.js).toEqual([]);
    expect(parsed.desktop.css).toEqual([]);
    expect(parsed.mobile.js).toEqual([]);
    expect(parsed.mobile.css).toEqual([]);
  });

  it("should sanitize file names containing path traversal sequences", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-1",
              name: "../../etc/passwd",
              contentType: "text/javascript",
              size: "100",
            },
          },
        ],
        css: [],
      },
      mobile: { js: [], css: [] },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath, filePrefix },
    });

    const parsed = ConfigParser.parse(result.configText);
    expect(parsed.desktop.js[0]).toEqual({
      type: "FILE",
      path: "desktop/js/passwd",
    });
    expect(
      container.fileWriter.writtenFiles.has(
        "/project/customize/myapp/desktop/js/passwd",
      ),
    ).toBe(true);
  });

  it("should deduplicate same-name files", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-1",
              name: "app.js",
              contentType: "text/javascript",
              size: "100",
            },
          },
          {
            type: "FILE",
            file: {
              fileKey: "fk-2",
              name: "app.js",
              contentType: "text/javascript",
              size: "200",
            },
          },
        ],
        css: [],
      },
      mobile: { js: [], css: [] },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath, filePrefix },
    });

    const parsed = ConfigParser.parse(result.configText);
    expect(parsed.desktop.js).toHaveLength(2);
    expect(parsed.desktop.js[0]).toEqual({
      type: "FILE",
      path: "desktop/js/app.js",
    });
    expect(parsed.desktop.js[1]).toEqual({
      type: "FILE",
      path: "desktop/js/app_1.js",
    });

    expect(container.fileWriter.writtenFiles.size).toBe(2);
  });

  it("should propagate download errors", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-1",
              name: "app.js",
              contentType: "text/javascript",
              size: "100",
            },
          },
        ],
        css: [],
      },
      mobile: { js: [], css: [] },
      revision: "1",
    });
    container.fileDownloader.setFailOn("download");

    await expect(
      captureCustomization({
        container,
        input: { basePath, filePrefix },
      }),
    ).rejects.toThrow("download failed");
  });

  it("should propagate file write errors", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-1",
              name: "app.js",
              contentType: "text/javascript",
              size: "100",
            },
          },
        ],
        css: [],
      },
      mobile: { js: [], css: [] },
      revision: "1",
    });
    container.fileWriter.setFailOn("write");

    await expect(
      captureCustomization({
        container,
        input: { basePath, filePrefix },
      }),
    ).rejects.toThrow("write failed");
  });

  it("should propagate API errors", async () => {
    setup();
    container.customizationConfigurator.setFailOn("getCustomization");

    await expect(
      captureCustomization({
        container,
        input: { basePath, filePrefix },
      }),
    ).rejects.toThrow("getCustomization failed");
  });

  it("should download files directly under basePath when filePrefix is empty", async () => {
    setup();
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "fk-1",
              name: "app.js",
              contentType: "text/javascript",
              size: "100",
            },
          },
        ],
        css: [],
      },
      mobile: { js: [], css: [] },
      revision: "1",
    });

    const result = await captureCustomization({
      container,
      input: { basePath: "/project/myapp", filePrefix: "" },
    });

    const parsed = ConfigParser.parse(result.configText);
    expect(parsed.desktop.js[0]).toEqual({
      type: "FILE",
      path: "desktop/js/app.js",
    });

    expect(
      container.fileWriter.writtenFiles.has("/project/myapp/desktop/js/app.js"),
    ).toBe(true);
  });
});
