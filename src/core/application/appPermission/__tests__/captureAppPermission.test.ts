import { describe, expect, it } from "vitest";
import { setupTestAppPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureAppPermission } from "../captureAppPermission";

describe("captureAppPermission", () => {
  const getContainer = setupTestAppPermissionContainer();

  describe("success cases", () => {
    it("should capture app permissions and serialize to YAML", async () => {
      const container = getContainer();
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

      const result = await captureAppPermission({ container });

      expect(result.configText).toContain("Administrators");
      expect(result.configText).toContain("GROUP");
      expect(result.configText).toContain("appEditable: true");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.appPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });
      container.appPermissionStorage.setContent("existing content");

      const result = await captureAppPermission({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.appPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });

      const result = await captureAppPermission({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getAppPermissions() fails", async () => {
      const container = getContainer();
      container.appPermissionConfigurator.setFailOn("getAppPermissions");

      await expect(captureAppPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when appPermissionStorage.get() fails", async () => {
      const container = getContainer();
      container.appPermissionStorage.setFailOn("get");

      await expect(captureAppPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
