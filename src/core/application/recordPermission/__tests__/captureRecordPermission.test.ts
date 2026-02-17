import { describe, expect, it } from "vitest";
import { setupTestRecordPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureRecordPermission } from "../captureRecordPermission";

describe("captureRecordPermission", () => {
  const getContainer = setupTestRecordPermissionContainer();

  describe("success cases", () => {
    it("should capture record permissions and serialize to YAML", async () => {
      const container = getContainer();
      container.recordPermissionConfigurator.setPermissions({
        rights: [
          {
            filterCond: 'status = "open"',
            entities: [
              {
                entity: { type: "USER", code: "user1" },
                viewable: true,
                editable: true,
                deletable: false,
                includeSubs: false,
              },
            ],
          },
        ],
        revision: "1",
      });

      const result = await captureRecordPermission({ container });

      expect(result.configText).toContain("user1");
      expect(result.configText).toContain("viewable: true");
      expect(result.configText).toContain("editable: true");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.recordPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });
      container.recordPermissionStorage.setContent("existing content");

      const result = await captureRecordPermission({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.recordPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });

      const result = await captureRecordPermission({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getRecordPermissions() fails", async () => {
      const container = getContainer();
      container.recordPermissionConfigurator.setFailOn("getRecordPermissions");

      await expect(captureRecordPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when recordPermissionStorage.get() fails", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setFailOn("get");

      await expect(captureRecordPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
