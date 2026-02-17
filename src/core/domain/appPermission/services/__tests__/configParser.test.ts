import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { AppPermissionErrorCode } from "../../errorCode";
import { AppPermissionConfigParser } from "../configParser";

describe("AppPermissionConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple rights", () => {
      const yaml = `
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
      const config = AppPermissionConfigParser.parse(yaml);

      expect(config.rights).toHaveLength(2);
      expect(config.rights[0]).toEqual({
        entity: { type: "GROUP", code: "Administrators" },
        includeSubs: false,
        appEditable: true,
        recordViewable: true,
        recordAddable: true,
        recordEditable: true,
        recordDeletable: true,
        recordImportable: true,
        recordExportable: true,
      });
      expect(config.rights[1]).toEqual({
        entity: { type: "USER", code: "user1" },
        includeSubs: false,
        appEditable: false,
        recordViewable: true,
        recordAddable: true,
        recordEditable: false,
        recordDeletable: false,
        recordImportable: false,
        recordExportable: false,
      });
    });

    it("should parse config with CREATOR entity type and empty code", () => {
      const yaml = `
rights:
  - entity:
      type: CREATOR
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: false
    recordEditable: false
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;
      const config = AppPermissionConfigParser.parse(yaml);

      expect(config.rights[0].entity).toEqual({
        type: "CREATOR",
        code: "",
      });
    });

    it("should parse config with ORGANIZATION and includeSubs true", () => {
      const yaml = `
rights:
  - entity:
      type: ORGANIZATION
      code: dev-team
    includeSubs: true
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;
      const config = AppPermissionConfigParser.parse(yaml);

      expect(config.rights[0].includeSubs).toBe(true);
      expect(config.rights[0].entity.type).toBe("ORGANIZATION");
    });

    it("should throw ApEmptyConfigText for empty text", () => {
      expect(() => AppPermissionConfigParser.parse("")).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApEmptyConfigText,
        }),
      );
    });

    it("should throw ApEmptyConfigText for whitespace-only text", () => {
      expect(() => AppPermissionConfigParser.parse("   \n  ")).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApEmptyConfigText,
        }),
      );
    });

    it("should throw ApInvalidConfigYaml for invalid YAML", () => {
      expect(() => AppPermissionConfigParser.parse("{ invalid: yaml:")).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse("{ invalid: yaml:")).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigYaml,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure for non-object YAML", () => {
      expect(() => AppPermissionConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure when rights is missing", () => {
      const yaml = `
someOtherKey: value
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });

    it("should throw ApInvalidEntityType for invalid entity type", () => {
      const yaml = `
rights:
  - entity:
      type: INVALID
      code: user1
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: false
    recordEditable: false
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidEntityType,
        }),
      );
    });

    it("should throw ApEmptyEntityCode for empty entity code on non-CREATOR type", () => {
      const yaml = `
rights:
  - entity:
      type: USER
      code: ""
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: false
    recordEditable: false
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApEmptyEntityCode,
        }),
      );
    });

    it("should throw ApEmptyEntityCode when code is missing on non-CREATOR type", () => {
      const yaml = `
rights:
  - entity:
      type: GROUP
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: false
    recordEditable: false
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApEmptyEntityCode,
        }),
      );
    });

    it("should throw ApDuplicateEntity for duplicate entity", () => {
      const yaml = `
rights:
  - entity:
      type: GROUP
      code: everyone
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
  - entity:
      type: GROUP
      code: everyone
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApDuplicateEntity,
        }),
      );
    });

    it("should allow same code with different entity types", () => {
      const yaml = `
rights:
  - entity:
      type: USER
      code: admin
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
  - entity:
      type: GROUP
      code: admin
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: false
    recordEditable: false
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;
      const config = AppPermissionConfigParser.parse(yaml);
      expect(config.rights).toHaveLength(2);
    });

    it("should throw ApInvalidBooleanField when a boolean field is missing", () => {
      const yaml = `
rights:
  - entity:
      type: USER
      code: user1
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidBooleanField,
        }),
      );
    });

    it("should throw ApInvalidBooleanField when a boolean field has non-boolean value", () => {
      const yaml = `
rights:
  - entity:
      type: USER
      code: user1
    includeSubs: false
    appEditable: "yes"
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidBooleanField,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure when entity is not an object", () => {
      const yaml = `
rights:
  - entity: not-an-object
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: false
    recordEditable: false
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure when right is not an object", () => {
      const yaml = `
rights:
  - not-an-object
`;
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });
  });
});
