import { describe, expect, it } from "vitest";
import { setupTestRecordPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyRecordPermission } from "../applyRecordPermission";

const VALID_CONFIG = `
rights:
  - filterCond: status = "open"
    entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: true
        deletable: false
        includeSubs: false
      - entity:
          type: GROUP
          code: group1
        viewable: true
        editable: false
        deletable: false
        includeSubs: true
  - filterCond: ""
    entities:
      - entity:
          type: ORGANIZATION
          code: org1
        viewable: true
        editable: true
        deletable: true
        includeSubs: false
`;

describe("applyRecordPermission", () => {
  const getContainer = setupTestRecordPermissionContainer();

  describe("success cases", () => {
    it("should read config and update record permissions", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent(VALID_CONFIG);

      await applyRecordPermission({ container });

      expect(container.recordPermissionConfigurator.callLog).toEqual([
        "getRecordPermissions",
        "updateRecordPermissions",
      ]);
      expect(
        container.recordPermissionConfigurator.lastUpdateParams?.rights,
      ).toHaveLength(2);
      expect(
        container.recordPermissionConfigurator.lastUpdateParams?.rights[0]
          .filterCond,
      ).toBe('status = "open"');
      expect(
        container.recordPermissionConfigurator.lastUpdateParams?.revision,
      ).toBe("1");
    });

    it("should pass revision from current permissions", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent(VALID_CONFIG);
      container.recordPermissionConfigurator.setPermissions({
        rights: [],
        revision: "42",
      });

      await applyRecordPermission({ container });

      expect(
        container.recordPermissionConfigurator.lastUpdateParams?.revision,
      ).toBe("42");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file does not exist", async () => {
      const container = getContainer();

      await expect(applyRecordPermission({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for empty config", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent("");

      await expect(applyRecordPermission({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent("{ invalid: yaml:");

      await expect(applyRecordPermission({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when recordPermissionStorage.get() fails", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setFailOn("get");

      await expect(applyRecordPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when getRecordPermissions() fails", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent(VALID_CONFIG);
      container.recordPermissionConfigurator.setFailOn("getRecordPermissions");

      await expect(applyRecordPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when updateRecordPermissions() fails", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent(VALID_CONFIG);
      container.recordPermissionConfigurator.setFailOn(
        "updateRecordPermissions",
      );

      await expect(applyRecordPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
