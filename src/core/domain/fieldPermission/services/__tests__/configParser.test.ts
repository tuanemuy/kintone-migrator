import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { FieldPermissionErrorCode } from "../../errorCode";
import { FieldPermissionConfigParser } from "../configParser";

describe("FieldPermissionConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple rights", () => {
      const yaml = `
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
        includeSubs: true
`;
      const config = FieldPermissionConfigParser.parse(yaml);

      expect(config.rights).toHaveLength(2);
      expect(config.rights[0].code).toBe("field_code_1");
      expect(config.rights[0].entities).toHaveLength(2);
      expect(config.rights[0].entities[0]).toEqual({
        accessibility: "WRITE",
        entity: { type: "USER", code: "user1" },
      });
      expect(config.rights[0].entities[1]).toEqual({
        accessibility: "READ",
        entity: { type: "GROUP", code: "group1" },
        includeSubs: true,
      });
      expect(config.rights[1].code).toBe("field_code_2");
      expect(config.rights[1].entities[0]).toEqual({
        accessibility: "NONE",
        entity: { type: "ORGANIZATION", code: "org1" },
        includeSubs: true,
      });
    });

    it("should parse config with FIELD_ENTITY type", () => {
      const yaml = `
rights:
  - code: field_code_1
    entities:
      - accessibility: READ
        entity:
          type: FIELD_ENTITY
          code: creator_field
`;
      const config = FieldPermissionConfigParser.parse(yaml);

      expect(config.rights[0].entities[0]).toEqual({
        accessibility: "READ",
        entity: { type: "FIELD_ENTITY", code: "creator_field" },
      });
    });

    it("should parse config without includeSubs", () => {
      const yaml = `
rights:
  - code: field_code_1
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user1
`;
      const config = FieldPermissionConfigParser.parse(yaml);

      expect(config.rights[0].entities[0].includeSubs).toBeUndefined();
    });

    it("should parse config with empty entities array", () => {
      const yaml = `
rights:
  - code: field_code_1
    entities: []
`;
      const config = FieldPermissionConfigParser.parse(yaml);

      expect(config.rights[0].entities).toHaveLength(0);
    });

    it("should throw EmptyConfigText for empty text", () => {
      expect(() => FieldPermissionConfigParser.parse("")).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpEmptyConfigText,
        }),
      );
    });

    it("should throw EmptyConfigText for whitespace-only text", () => {
      expect(() => FieldPermissionConfigParser.parse("   \n  ")).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpEmptyConfigText,
        }),
      );
    });

    it("should throw InvalidConfigYaml for invalid YAML", () => {
      expect(() =>
        FieldPermissionConfigParser.parse("{ invalid: yaml:"),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse("{ invalid: yaml:"),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigYaml,
        }),
      );
    });

    it("should throw InvalidConfigStructure for non-object YAML", () => {
      expect(() => FieldPermissionConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidConfigStructure when rights is missing", () => {
      const yaml = `
someOtherKey: value
`;
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidAccessibility for invalid accessibility value", () => {
      const yaml = `
rights:
  - code: field_code_1
    entities:
      - accessibility: INVALID
        entity:
          type: USER
          code: user1
`;
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidAccessibility,
        }),
      );
    });

    it("should throw InvalidEntityType for invalid entity type", () => {
      const yaml = `
rights:
  - code: field_code_1
    entities:
      - accessibility: READ
        entity:
          type: INVALID
          code: user1
`;
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidEntityType,
        }),
      );
    });

    it("should throw EmptyFieldCode for empty field code", () => {
      const yaml = `
rights:
  - code: ""
    entities: []
`;
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpEmptyFieldCode,
        }),
      );
    });

    it("should throw EmptyEntityCode for empty entity code", () => {
      const yaml = `
rights:
  - code: field_code_1
    entities:
      - accessibility: READ
        entity:
          type: USER
          code: ""
`;
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpEmptyEntityCode,
        }),
      );
    });

    it("should throw DuplicateFieldCode for duplicate field codes", () => {
      const yaml = `
rights:
  - code: field_code_1
    entities:
      - accessibility: READ
        entity:
          type: USER
          code: user1
  - code: field_code_1
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user2
`;
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpDuplicateFieldCode,
        }),
      );
    });
  });
});
