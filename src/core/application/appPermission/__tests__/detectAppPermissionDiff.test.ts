import { describe, expect, it } from "vitest";
import { setupTestAppPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectAppPermissionDiff } from "../detectAppPermissionDiff";

const VALID_CONFIG = `
rights:
  - entity:
      type: GROUP
      code: Administrators
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
`;

describe("detectAppPermissionDiff", () => {
  const getContainer = setupTestAppPermissionContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent(VALID_CONFIG);
      container.appPermissionConfigurator.setPermissions({
        rights: [
          {
            entity: { type: "GROUP", code: "Administrators" },
            includeSubs: false,
            appEditable: true,
            recordViewable: true,
            recordAddable: true,
            recordEditable: true,
            recordDeletable: true,
            recordImportable: true,
            recordExportable: true,
          },
        ],
        revision: "1",
      });

      const result = await detectAppPermissionDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent(VALID_CONFIG);
      container.appPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });

      const result = await detectAppPermissionDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.added).toBe(1);
      expect(result.entries[0].type).toBe("added");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectAppPermissionDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.appPermissionStorage.setFailOn("get");

      await expect(detectAppPermissionDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent(VALID_CONFIG);
      container.appPermissionConfigurator.setFailOn("getAppPermissions");

      await expect(detectAppPermissionDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
