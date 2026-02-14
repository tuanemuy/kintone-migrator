import { describe, expect, it } from "vitest";
import { setupTestFieldPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureFieldPermission } from "../captureFieldPermission";

describe("captureFieldPermission", () => {
  const getContainer = setupTestFieldPermissionContainer();

  describe("success cases", () => {
    it("should capture field permissions and serialize to YAML", async () => {
      const container = getContainer();
      container.fieldPermissionConfigurator.setPermissions({
        rights: [
          {
            code: "field_code_1",
            entities: [
              {
                accessibility: "WRITE",
                entity: { type: "USER", code: "user1" },
              },
            ],
          },
        ],
        revision: "1",
      });

      const result = await captureFieldPermission({ container });

      expect(result.configText).toContain("field_code_1");
      expect(result.configText).toContain("WRITE");
      expect(result.configText).toContain("user1");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.fieldPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });
      container.fieldPermissionStorage.setContent("existing content");

      const result = await captureFieldPermission({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.fieldPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });

      const result = await captureFieldPermission({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getFieldPermissions() fails", async () => {
      const container = getContainer();
      container.fieldPermissionConfigurator.setFailOn("getFieldPermissions");

      await expect(captureFieldPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when fieldPermissionStorage.get() fails", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setFailOn("get");

      await expect(captureFieldPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
