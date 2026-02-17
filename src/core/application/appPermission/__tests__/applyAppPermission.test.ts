import { describe, expect, it } from "vitest";
import { setupTestAppPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyAppPermission } from "../applyAppPermission";

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
  - entity:
      type: USER
      code: user1
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: false
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;

describe("applyAppPermission", () => {
  const getContainer = setupTestAppPermissionContainer();

  describe("success cases", () => {
    it("should read config and update app permissions", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent(VALID_CONFIG);

      await applyAppPermission({ container });

      expect(container.appPermissionConfigurator.callLog).toEqual([
        "getAppPermissions",
        "updateAppPermissions",
      ]);
      expect(
        container.appPermissionConfigurator.lastUpdateParams?.rights,
      ).toHaveLength(2);
      expect(
        container.appPermissionConfigurator.lastUpdateParams?.rights[0].entity
          .code,
      ).toBe("Administrators");
      expect(
        container.appPermissionConfigurator.lastUpdateParams?.revision,
      ).toBe("1");
    });

    it("should pass revision from current permissions", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent(VALID_CONFIG);
      container.appPermissionConfigurator.setPermissions({
        rights: [],
        revision: "42",
      });

      await applyAppPermission({ container });

      expect(
        container.appPermissionConfigurator.lastUpdateParams?.revision,
      ).toBe("42");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(applyAppPermission({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for empty config", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent("");

      await expect(applyAppPermission({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent("{ invalid: yaml:");

      await expect(applyAppPermission({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when appPermissionStorage.get() fails", async () => {
      const container = getContainer();
      container.appPermissionStorage.setFailOn("get");

      await expect(applyAppPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when getAppPermissions() fails", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent(VALID_CONFIG);
      container.appPermissionConfigurator.setFailOn("getAppPermissions");

      await expect(applyAppPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when updateAppPermissions() fails", async () => {
      const container = getContainer();
      container.appPermissionStorage.setContent(VALID_CONFIG);
      container.appPermissionConfigurator.setFailOn("updateAppPermissions");

      await expect(applyAppPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
