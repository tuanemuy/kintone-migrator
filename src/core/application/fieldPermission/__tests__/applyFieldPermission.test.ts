import { describe, expect, it } from "vitest";
import { setupTestFieldPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyFieldPermission } from "../applyFieldPermission";

const VALID_CONFIG = `
rights:
  - code: field_code_1
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user1
      - accessibility: READ
        entity:
          type: GROUP
          code: group1
        includeSubs: true
  - code: field_code_2
    entities:
      - accessibility: NONE
        entity:
          type: ORGANIZATION
          code: org1
`;

describe("applyFieldPermission", () => {
  const getContainer = setupTestFieldPermissionContainer();

  describe("success cases", () => {
    it("should read config and update field permissions", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent(VALID_CONFIG);

      await applyFieldPermission({ container });

      expect(container.fieldPermissionConfigurator.callLog).toEqual([
        "getFieldPermissions",
        "updateFieldPermissions",
      ]);
      expect(
        container.fieldPermissionConfigurator.lastUpdateParams?.rights,
      ).toHaveLength(2);
      expect(
        container.fieldPermissionConfigurator.lastUpdateParams?.rights[0].code,
      ).toBe("field_code_1");
      expect(
        container.fieldPermissionConfigurator.lastUpdateParams?.revision,
      ).toBe("1");
    });

    it("should pass revision from current permissions", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent(VALID_CONFIG);
      container.fieldPermissionConfigurator.setPermissions({
        rights: [],
        revision: "42",
      });

      await applyFieldPermission({ container });

      expect(
        container.fieldPermissionConfigurator.lastUpdateParams?.revision,
      ).toBe("42");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError for empty config", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent("");

      await expect(applyFieldPermission({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent("{ invalid: yaml:");

      await expect(applyFieldPermission({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when fieldPermissionStorage.get() fails", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setFailOn("get");

      await expect(applyFieldPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when getFieldPermissions() fails", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent(VALID_CONFIG);
      container.fieldPermissionConfigurator.setFailOn("getFieldPermissions");

      await expect(applyFieldPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when updateFieldPermissions() fails", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent(VALID_CONFIG);
      container.fieldPermissionConfigurator.setFailOn("updateFieldPermissions");

      await expect(applyFieldPermission({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
