import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { FieldPermissionErrorCode } from "../../errorCode";
import { FieldPermissionConfigParser } from "../configParser";

describe("FieldPermissionConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple rights", () => {
      const config = FieldPermissionConfigParser.parse({
        rights: [
          {
            code: "field_code_1",
            entities: [
              {
                accessibility: "WRITE",
                entity: { type: "USER", code: "user1" },
              },
              {
                accessibility: "READ",
                entity: { type: "GROUP", code: "group1" },
                includeSubs: true,
              },
            ],
          },
          {
            code: "field_code_2",
            entities: [
              {
                accessibility: "NONE",
                entity: { type: "ORGANIZATION", code: "org1" },
                includeSubs: true,
              },
            ],
          },
        ],
      });

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
      const config = FieldPermissionConfigParser.parse({
        rights: [
          {
            code: "field_code_1",
            entities: [
              {
                accessibility: "READ",
                entity: { type: "FIELD_ENTITY", code: "creator_field" },
              },
            ],
          },
        ],
      });

      expect(config.rights[0].entities[0]).toEqual({
        accessibility: "READ",
        entity: { type: "FIELD_ENTITY", code: "creator_field" },
      });
    });

    it("should parse config without includeSubs", () => {
      const config = FieldPermissionConfigParser.parse({
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
      });

      expect(config.rights[0].entities[0].includeSubs).toBeUndefined();
    });

    it("should parse config with empty entities array", () => {
      const config = FieldPermissionConfigParser.parse({
        rights: [
          {
            code: "field_code_1",
            entities: [],
          },
        ],
      });

      expect(config.rights[0].entities).toHaveLength(0);
    });

    it("should throw InvalidConfigStructure for non-object input", () => {
      expect(() => FieldPermissionConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidConfigStructure for array input", () => {
      expect(() => FieldPermissionConfigParser.parse(["item1"])).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidConfigStructure for null input", () => {
      expect(() => FieldPermissionConfigParser.parse(null)).toThrow(
        BusinessRuleError,
      );
      expect(() => FieldPermissionConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidConfigStructure when rights is missing", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({ someOtherKey: "value" }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({ someOtherKey: "value" }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidAccessibility for invalid accessibility value", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "INVALID",
                  entity: { type: "USER", code: "user1" },
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "INVALID",
                  entity: { type: "USER", code: "user1" },
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidAccessibility,
        }),
      );
    });

    it("should throw InvalidEntityType for invalid entity type", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "READ",
                  entity: { type: "INVALID", code: "user1" },
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "READ",
                  entity: { type: "INVALID", code: "user1" },
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidEntityType,
        }),
      );
    });

    it("should throw EmptyFieldCode for empty field code", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [{ code: "", entities: [] }],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [{ code: "", entities: [] }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpEmptyFieldCode,
        }),
      );
    });

    it("should throw EmptyEntityCode for empty entity code", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "READ",
                  entity: { type: "USER", code: "" },
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "READ",
                  entity: { type: "USER", code: "" },
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpEmptyEntityCode,
        }),
      );
    });

    it("should throw for non-object field right", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: ["not_an_object"],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: ["not_an_object"],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-array entities in field right", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [{ code: "field_code_1", entities: "not_an_array" }],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [{ code: "field_code_1", entities: "not_an_array" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object field right entity", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: ["not_an_object"],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: ["not_an_object"],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object entity in field right entity", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "READ",
                  entity: "not_an_object",
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "READ",
                  entity: "not_an_object",
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpInvalidConfigStructure,
        }),
      );
    });

    it("should parse includeSubs as false", () => {
      const config = FieldPermissionConfigParser.parse({
        rights: [
          {
            code: "field_code_1",
            entities: [
              {
                accessibility: "READ",
                entity: { type: "GROUP", code: "group1" },
                includeSubs: false,
              },
            ],
          },
        ],
      });
      expect(config.rights[0].entities[0].includeSubs).toBe(false);
    });

    it("should throw DuplicateFieldCode for duplicate field codes", () => {
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "READ",
                  entity: { type: "USER", code: "user1" },
                },
              ],
            },
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "WRITE",
                  entity: { type: "USER", code: "user2" },
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        FieldPermissionConfigParser.parse({
          rights: [
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "READ",
                  entity: { type: "USER", code: "user1" },
                },
              ],
            },
            {
              code: "field_code_1",
              entities: [
                {
                  accessibility: "WRITE",
                  entity: { type: "USER", code: "user2" },
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: FieldPermissionErrorCode.FpDuplicateFieldCode,
        }),
      );
    });
  });
});
