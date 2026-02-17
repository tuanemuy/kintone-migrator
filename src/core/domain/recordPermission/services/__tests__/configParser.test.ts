import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { RecordPermissionErrorCode } from "../../errorCode";
import { RecordPermissionConfigParser } from "../configParser";

describe("RecordPermissionConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple rights", () => {
      const yaml = `
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
      const config = RecordPermissionConfigParser.parse(yaml);

      expect(config.rights).toHaveLength(2);
      expect(config.rights[0].filterCond).toBe('status = "open"');
      expect(config.rights[0].entities).toHaveLength(2);
      expect(config.rights[0].entities[0]).toEqual({
        entity: { type: "USER", code: "user1" },
        viewable: true,
        editable: true,
        deletable: false,
        includeSubs: false,
      });
      expect(config.rights[0].entities[1]).toEqual({
        entity: { type: "GROUP", code: "group1" },
        viewable: true,
        editable: false,
        deletable: false,
        includeSubs: true,
      });
      expect(config.rights[1].filterCond).toBe("");
      expect(config.rights[1].entities[0]).toEqual({
        entity: { type: "ORGANIZATION", code: "org1" },
        viewable: true,
        editable: true,
        deletable: true,
        includeSubs: false,
      });
    });

    it("should parse config with FIELD_ENTITY type", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: FIELD_ENTITY
          code: creator_field
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;
      const config = RecordPermissionConfigParser.parse(yaml);

      expect(config.rights[0].entities[0]).toEqual({
        entity: { type: "FIELD_ENTITY", code: "creator_field" },
        viewable: true,
        editable: false,
        deletable: false,
        includeSubs: false,
      });
    });

    it("should parse config with empty entities array", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities: []
`;
      const config = RecordPermissionConfigParser.parse(yaml);

      expect(config.rights[0].entities).toHaveLength(0);
    });

    it("should default boolean fields to false when omitted", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: user1
`;
      const config = RecordPermissionConfigParser.parse(yaml);

      expect(config.rights[0].entities[0].viewable).toBe(false);
      expect(config.rights[0].entities[0].editable).toBe(false);
      expect(config.rights[0].entities[0].deletable).toBe(false);
      expect(config.rights[0].entities[0].includeSubs).toBe(false);
    });

    it("should default filterCond to empty string when omitted", () => {
      const yaml = `
rights:
  - entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;
      const config = RecordPermissionConfigParser.parse(yaml);

      expect(config.rights[0].filterCond).toBe("");
    });

    it("should throw EmptyConfigText for empty text", () => {
      expect(() => RecordPermissionConfigParser.parse("")).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpEmptyConfigText,
        }),
      );
    });

    it("should throw EmptyConfigText for whitespace-only text", () => {
      expect(() => RecordPermissionConfigParser.parse("   \n  ")).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpEmptyConfigText,
        }),
      );
    });

    it("should throw InvalidConfigYaml for invalid YAML", () => {
      expect(() =>
        RecordPermissionConfigParser.parse("{ invalid: yaml:"),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse("{ invalid: yaml:"),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigYaml,
        }),
      );
    });

    it("should throw InvalidConfigStructure for non-object YAML", () => {
      expect(() => RecordPermissionConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidConfigStructure when rights is missing", () => {
      const yaml = `
someOtherKey: value
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidEntityType for invalid entity type", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: INVALID
          code: user1
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidEntityType,
        }),
      );
    });

    it("should throw EmptyEntityCode for empty entity code", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: ""
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpEmptyEntityCode,
        }),
      );
    });

    it("should throw InvalidPermissionValue for non-boolean permission value", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: user1
        viewable: "yes"
        editable: false
        deletable: false
        includeSubs: false
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidPermissionValue,
        }),
      );
    });

    it("should throw InvalidPermissionValue for numeric permission value", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: 1
        deletable: false
        includeSubs: false
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidPermissionValue,
        }),
      );
    });

    it("should throw for non-object record right", () => {
      const yaml = `
rights:
  - not_an_object
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-array entities in record right", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities: not_an_array
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object record right entity", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - not_an_object
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object entity in record right entity", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity: not_an_object
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidPermissionValue for string deletable value", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: false
        deletable: "no"
        includeSubs: false
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidPermissionValue,
        }),
      );
    });

    it("should throw InvalidPermissionValue for string includeSubs value", () => {
      const yaml = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: false
        deletable: false
        includeSubs: "true"
`;
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidPermissionValue,
        }),
      );
    });

    it("should parse filterCond as string", () => {
      const yaml = `
rights:
  - filterCond: 'status = "active"'
    entities: []
`;
      const config = RecordPermissionConfigParser.parse(yaml);
      expect(config.rights[0].filterCond).toBe('status = "active"');
    });
  });
});
