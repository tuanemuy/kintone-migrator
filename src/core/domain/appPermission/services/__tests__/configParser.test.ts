import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { AppPermissionErrorCode } from "../../errorCode";
import { AppPermissionConfigParser } from "../configParser";

describe("AppPermissionConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple rights", () => {
      const config = AppPermissionConfigParser.parse({
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
          {
            entity: { type: "USER", code: "user1" },
            includeSubs: false,
            appEditable: false,
            recordViewable: true,
            recordAddable: true,
            recordEditable: false,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
        ],
      });

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
      const config = AppPermissionConfigParser.parse({
        rights: [
          {
            entity: { type: "CREATOR" },
            includeSubs: false,
            appEditable: false,
            recordViewable: true,
            recordAddable: false,
            recordEditable: false,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
        ],
      });

      expect(config.rights[0].entity).toEqual({
        type: "CREATOR",
        code: "",
      });
    });

    it("should parse config with CREATOR entity type and non-empty code", () => {
      const config = AppPermissionConfigParser.parse({
        rights: [
          {
            entity: { type: "CREATOR", code: "creator_user" },
            includeSubs: false,
            appEditable: false,
            recordViewable: true,
            recordAddable: false,
            recordEditable: false,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
        ],
      });

      expect(config.rights[0].entity).toEqual({
        type: "CREATOR",
        code: "creator_user",
      });
    });

    it("should parse config with ORGANIZATION and includeSubs true", () => {
      const config = AppPermissionConfigParser.parse({
        rights: [
          {
            entity: { type: "ORGANIZATION", code: "dev-team" },
            includeSubs: true,
            appEditable: false,
            recordViewable: true,
            recordAddable: true,
            recordEditable: true,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
        ],
      });

      expect(config.rights[0].includeSubs).toBe(true);
      expect(config.rights[0].entity.type).toBe("ORGANIZATION");
    });

    it("should throw ApInvalidConfigStructure for non-object input", () => {
      expect(() => AppPermissionConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure for array input", () => {
      expect(() => AppPermissionConfigParser.parse(["item1"])).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure for null input", () => {
      expect(() => AppPermissionConfigParser.parse(null)).toThrow(
        BusinessRuleError,
      );
      expect(() => AppPermissionConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure when rights is missing", () => {
      expect(() =>
        AppPermissionConfigParser.parse({ someOtherKey: "value" }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({ someOtherKey: "value" }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });

    it("should throw ApInvalidEntityType for invalid entity type", () => {
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "INVALID", code: "user1" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: false,
              recordEditable: false,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "INVALID", code: "user1" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: false,
              recordEditable: false,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidEntityType,
        }),
      );
    });

    it("should throw ApEmptyEntityCode for empty entity code on non-CREATOR type", () => {
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "USER", code: "" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: false,
              recordEditable: false,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "USER", code: "" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: false,
              recordEditable: false,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApEmptyEntityCode,
        }),
      );
    });

    it("should throw ApEmptyEntityCode when code is missing on non-CREATOR type", () => {
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "GROUP" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: false,
              recordEditable: false,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "GROUP" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: false,
              recordEditable: false,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApEmptyEntityCode,
        }),
      );
    });

    it("should throw ApDuplicateEntity for duplicate entity", () => {
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "GROUP", code: "everyone" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: true,
              recordEditable: true,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
            {
              entity: { type: "GROUP", code: "everyone" },
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
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "GROUP", code: "everyone" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: true,
              recordEditable: true,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
            {
              entity: { type: "GROUP", code: "everyone" },
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
        }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApDuplicateEntity,
        }),
      );
    });

    it("should allow same code with different entity types", () => {
      const config = AppPermissionConfigParser.parse({
        rights: [
          {
            entity: { type: "USER", code: "admin" },
            includeSubs: false,
            appEditable: true,
            recordViewable: true,
            recordAddable: true,
            recordEditable: true,
            recordDeletable: true,
            recordImportable: true,
            recordExportable: true,
          },
          {
            entity: { type: "GROUP", code: "admin" },
            includeSubs: false,
            appEditable: false,
            recordViewable: true,
            recordAddable: false,
            recordEditable: false,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
        ],
      });
      expect(config.rights).toHaveLength(2);
    });

    it("should throw ApInvalidBooleanField when a boolean field is missing", () => {
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "USER", code: "user1" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: true,
              recordEditable: true,
              recordDeletable: true,
              recordImportable: true,
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "USER", code: "user1" },
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: true,
              recordEditable: true,
              recordDeletable: true,
              recordImportable: true,
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidBooleanField,
        }),
      );
    });

    it("should throw ApInvalidBooleanField when a boolean field has non-boolean value", () => {
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "USER", code: "user1" },
              includeSubs: false,
              appEditable: "yes",
              recordViewable: true,
              recordAddable: true,
              recordEditable: true,
              recordDeletable: true,
              recordImportable: true,
              recordExportable: true,
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: { type: "USER", code: "user1" },
              includeSubs: false,
              appEditable: "yes",
              recordViewable: true,
              recordAddable: true,
              recordEditable: true,
              recordDeletable: true,
              recordImportable: true,
              recordExportable: true,
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidBooleanField,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure when entity is not an object", () => {
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: "not-an-object",
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: false,
              recordEditable: false,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: [
            {
              entity: "not-an-object",
              includeSubs: false,
              appEditable: false,
              recordViewable: true,
              recordAddable: false,
              recordEditable: false,
              recordDeletable: false,
              recordImportable: false,
              recordExportable: false,
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });

    it("should throw ApInvalidConfigStructure when right is not an object", () => {
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: ["not-an-object"],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AppPermissionConfigParser.parse({
          rights: ["not-an-object"],
        }),
      ).toThrow(
        expect.objectContaining({
          code: AppPermissionErrorCode.ApInvalidConfigStructure,
        }),
      );
    });
  });
});
