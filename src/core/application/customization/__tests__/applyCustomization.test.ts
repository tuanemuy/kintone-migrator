import { describe, expect, it } from "vitest";
import { setupTestContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { CustomizationErrorCode } from "@/core/domain/customization/errorCode";
import { isBusinessRuleError } from "@/core/domain/error";
import { applyCustomization } from "../applyCustomization";

const VALID_CONFIG = `
scope: ALL
desktop:
  js:
    - type: FILE
      path: ./dist/desktop.js
    - type: URL
      url: https://cdn.example.com/lib.js
  css:
    - type: FILE
      path: ./styles/desktop.css
mobile:
  js:
    - type: FILE
      path: ./dist/mobile.js
  css: []
`;

const VALID_CONFIG_NO_SCOPE = `
desktop:
  js:
    - type: FILE
      path: ./dist/desktop.js
  css: []
mobile:
  js: []
  css: []
`;

const URL_ONLY_CONFIG = `
scope: ADMIN
desktop:
  js:
    - type: URL
      url: https://cdn.example.com/lib.js
  css: []
mobile:
  js: []
  css: []
`;

describe("applyCustomization", () => {
  const getContainer = setupTestContainer();

  describe("正常系", () => {
    it("FILEリソースをアップロードしカスタマイズを更新する", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG);

      await applyCustomization({
        container,
        input: { basePath: "/project" },
      });

      expect(container.fileUploader.callLog).toEqual([
        "upload",
        "upload",
        "upload",
      ]);
      expect(container.customizationConfigurator.callLog).toEqual([
        "getCustomization",
        "updateCustomization",
      ]);
      expect(container.customizationConfigurator.lastUpdateParams?.scope).toBe(
        "ALL",
      );
    });

    it("URLのみの設定ではファイルアップロードしない", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(URL_ONLY_CONFIG);

      await applyCustomization({
        container,
        input: { basePath: "/project" },
      });

      expect(container.fileUploader.callLog).toHaveLength(0);
      expect(container.customizationConfigurator.lastUpdateParams?.scope).toBe(
        "ADMIN",
      );
    });

    it("設定でscopeが省略された場合、scopeを設定しない", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG_NO_SCOPE);

      await applyCustomization({
        container,
        input: { basePath: "/project" },
      });

      expect(
        container.customizationConfigurator.lastUpdateParams?.scope,
      ).toBeUndefined();
    });

    it("既存のカスタマイズとマージする（未言及のリソースは保持）", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG_NO_SCOPE);
      container.customizationConfigurator.setCustomization({
        scope: "ALL",
        desktop: {
          js: [
            {
              type: "FILE",
              file: {
                fileKey: "fk-existing",
                name: "existing.js",
                contentType: "application/javascript",
                size: "100",
              },
            },
          ],
          css: [],
        },
        mobile: { js: [], css: [] },
        revision: "5",
      });

      await applyCustomization({
        container,
        input: { basePath: "/project" },
      });

      const params = container.customizationConfigurator.lastUpdateParams;
      expect(params?.revision).toBe("5");

      const desktopJs = params?.desktop?.js;
      expect(desktopJs).toHaveLength(2);
      expect(desktopJs?.[0]).toEqual({
        type: "FILE",
        fileKey: "fk-existing",
        name: "existing.js",
      });
      expect(desktopJs?.[1]).toMatchObject({
        type: "FILE",
        name: "desktop.js",
      });
    });

    it("同名の既存ファイルを置換する", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG_NO_SCOPE);
      container.customizationConfigurator.setCustomization({
        scope: "ALL",
        desktop: {
          js: [
            {
              type: "FILE",
              file: {
                fileKey: "fk-old",
                name: "desktop.js",
                contentType: "application/javascript",
                size: "100",
              },
            },
          ],
          css: [],
        },
        mobile: { js: [], css: [] },
        revision: "3",
      });

      await applyCustomization({
        container,
        input: { basePath: "/project" },
      });

      const params = container.customizationConfigurator.lastUpdateParams;
      const desktopJs = params?.desktop?.js;
      expect(desktopJs).toHaveLength(1);
      expect(desktopJs?.[0]).toMatchObject({
        type: "FILE",
        name: "desktop.js",
      });
      expect((desktopJs?.[0] as { fileKey: string }).fileKey).not.toBe(
        "fk-old",
      );
    });
  });

  describe("異常系", () => {
    it("設定ファイルが存在しない場合、ValidationErrorをスローする", async () => {
      const container = getContainer();

      await expect(
        applyCustomization({
          container,
          input: { basePath: "/project" },
        }),
      ).rejects.toSatisfy(isValidationError);
    });

    it("空の設定の場合、ValidationErrorをスローする", async () => {
      const container = getContainer();
      container.customizationStorage.setContent("");

      await expect(
        applyCustomization({
          container,
          input: { basePath: "/project" },
        }),
      ).rejects.toSatisfy(isValidationError);
    });

    it("不正なYAML設定の場合、ValidationErrorをスローする", async () => {
      const container = getContainer();
      container.customizationStorage.setContent("{ invalid: yaml:");

      await expect(
        applyCustomization({
          container,
          input: { basePath: "/project" },
        }),
      ).rejects.toSatisfy(isValidationError);
    });

    it("不正な設定構造の場合、ValidationErrorをスローする", async () => {
      const container = getContainer();
      container.customizationStorage.setContent("just a string value");

      await expect(
        applyCustomization({
          container,
          input: { basePath: "/project" },
        }),
      ).rejects.toSatisfy(isValidationError);
    });

    it("customizationStorage.get()が失敗した場合、SystemErrorをスローする", async () => {
      const container = getContainer();
      container.customizationStorage.setFailOn("get");

      await expect(
        applyCustomization({
          container,
          input: { basePath: "/project" },
        }),
      ).rejects.toSatisfy(isSystemError);
    });

    it("getCustomization()が失敗した場合、SystemErrorをスローする", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG);
      container.customizationConfigurator.setFailOn("getCustomization");

      await expect(
        applyCustomization({
          container,
          input: { basePath: "/project" },
        }),
      ).rejects.toSatisfy(isSystemError);
    });

    it("ファイルアップロードが失敗した場合、SystemErrorをスローする", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG);
      container.fileUploader.setFailOn("upload");

      await expect(
        applyCustomization({
          container,
          input: { basePath: "/project" },
        }),
      ).rejects.toSatisfy(isSystemError);
    });

    it("updateCustomization()が失敗した場合、SystemErrorをスローする", async () => {
      const container = getContainer();
      container.customizationStorage.setContent(VALID_CONFIG);
      container.customizationConfigurator.setFailOn("updateCustomization");

      await expect(
        applyCustomization({
          container,
          input: { basePath: "/project" },
        }),
      ).rejects.toSatisfy(isSystemError);
    });

    it("マージ後のリソースが30件を超える場合、BusinessRuleError(TooManyFiles)をスローする", async () => {
      const container = getContainer();

      const existingJs = Array.from({ length: 29 }, (_, i) => ({
        type: "FILE" as const,
        file: {
          fileKey: `fk-${i}`,
          name: `file-${i}.js`,
          contentType: "application/javascript",
          size: "100",
        },
      }));

      container.customizationConfigurator.setCustomization({
        scope: "ALL",
        desktop: { js: existingJs, css: [] },
        mobile: { js: [], css: [] },
        revision: "1",
      });

      const configWith2NewFiles = `
desktop:
  js:
    - type: FILE
      path: ./new1.js
    - type: FILE
      path: ./new2.js
  css: []
mobile:
  js: []
  css: []
`;
      container.customizationStorage.setContent(configWith2NewFiles);

      try {
        await applyCustomization({
          container,
          input: { basePath: "/project" },
        });
        expect.fail("Expected error to be thrown");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(CustomizationErrorCode.TooManyFiles);
        }
      }
    });
  });
});
