import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { RecordPermissionErrorCode } from "../../errorCode";
import { RecordPermissionConfigParser } from "../configParser";

describe("RecordPermissionConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple rights", () => {
      const config = RecordPermissionConfigParser.parse({
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
              {
                entity: { type: "GROUP", code: "group1" },
                viewable: true,
                editable: false,
                deletable: false,
                includeSubs: true,
              },
            ],
          },
          {
            filterCond: "",
            entities: [
              {
                entity: { type: "ORGANIZATION", code: "org1" },
                viewable: true,
                editable: true,
                deletable: true,
                includeSubs: false,
              },
            ],
          },
        ],
      });

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
      const config = RecordPermissionConfigParser.parse({
        rights: [
          {
            filterCond: "",
            entities: [
              {
                entity: { type: "FIELD_ENTITY", code: "creator_field" },
                viewable: true,
                editable: false,
                deletable: false,
                includeSubs: false,
              },
            ],
          },
        ],
      });

      expect(config.rights[0].entities[0]).toEqual({
        entity: { type: "FIELD_ENTITY", code: "creator_field" },
        viewable: true,
        editable: false,
        deletable: false,
        includeSubs: false,
      });
    });

    it("should parse config with empty entities array", () => {
      const config = RecordPermissionConfigParser.parse({
        rights: [{ filterCond: "", entities: [] }],
      });

      expect(config.rights[0].entities).toHaveLength(0);
    });

    it("should default boolean fields to false when omitted", () => {
      const config = RecordPermissionConfigParser.parse({
        rights: [
          {
            filterCond: "",
            entities: [
              {
                entity: { type: "USER", code: "user1" },
              },
            ],
          },
        ],
      });

      expect(config.rights[0].entities[0].viewable).toBe(false);
      expect(config.rights[0].entities[0].editable).toBe(false);
      expect(config.rights[0].entities[0].deletable).toBe(false);
      expect(config.rights[0].entities[0].includeSubs).toBe(false);
    });

    it("should default filterCond to empty string when omitted", () => {
      const config = RecordPermissionConfigParser.parse({
        rights: [
          {
            entities: [
              {
                entity: { type: "USER", code: "user1" },
                viewable: true,
                editable: false,
                deletable: false,
                includeSubs: false,
              },
            ],
          },
        ],
      });

      expect(config.rights[0].filterCond).toBe("");
    });

    it("should throw InvalidConfigStructure for non-object input", () => {
      expect(() => RecordPermissionConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidConfigStructure for array input", () => {
      expect(() => RecordPermissionConfigParser.parse(["item1"])).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidConfigStructure for null input", () => {
      expect(() => RecordPermissionConfigParser.parse(null)).toThrow(
        BusinessRuleError,
      );
      expect(() => RecordPermissionConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidConfigStructure when rights is missing", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({ someOtherKey: "value" }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({ someOtherKey: "value" }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidEntityType for invalid entity type", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "INVALID", code: "user1" },
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "INVALID", code: "user1" },
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidEntityType,
        }),
      );
    });

    it("should throw EmptyEntityCode for empty entity code", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "" },
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "" },
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpEmptyEntityCode,
        }),
      );
    });

    it("should throw InvalidPermissionValue for non-boolean permission value", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: "yes",
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: "yes",
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidPermissionValue,
        }),
      );
    });

    it("should throw InvalidPermissionValue for numeric permission value", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: true,
                  editable: 1,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: true,
                  editable: 1,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidPermissionValue,
        }),
      );
    });

    it("should throw for non-object record right", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: ["not_an_object"],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: ["not_an_object"],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-array entities in record right", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [{ filterCond: "", entities: "not_an_array" }],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [{ filterCond: "", entities: "not_an_array" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object record right entity", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [{ filterCond: "", entities: ["not_an_object"] }],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [{ filterCond: "", entities: ["not_an_object"] }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object entity in record right entity", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: "not_an_object",
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: "not_an_object",
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidConfigStructure,
        }),
      );
    });

    it("should throw InvalidPermissionValue for string deletable value", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: true,
                  editable: false,
                  deletable: "no",
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: true,
                  editable: false,
                  deletable: "no",
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidPermissionValue,
        }),
      );
    });

    it("should throw InvalidPermissionValue for string includeSubs value", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: "true",
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: "true",
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpInvalidPermissionValue,
        }),
      );
    });

    it("should throw RpDuplicateEntity for duplicate entity within a right", () => {
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: false,
                  editable: true,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        RecordPermissionConfigParser.parse({
          rights: [
            {
              filterCond: "",
              entities: [
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: true,
                  editable: false,
                  deletable: false,
                  includeSubs: false,
                },
                {
                  entity: { type: "USER", code: "user1" },
                  viewable: false,
                  editable: true,
                  deletable: false,
                  includeSubs: false,
                },
              ],
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: RecordPermissionErrorCode.RpDuplicateEntity,
        }),
      );
    });

    it("should allow same entity in different rights", () => {
      const config = RecordPermissionConfigParser.parse({
        rights: [
          {
            filterCond: "status = 1",
            entities: [
              {
                entity: { type: "USER", code: "user1" },
                viewable: true,
                editable: false,
                deletable: false,
                includeSubs: false,
              },
            ],
          },
          {
            filterCond: "status = 2",
            entities: [
              {
                entity: { type: "USER", code: "user1" },
                viewable: false,
                editable: true,
                deletable: false,
                includeSubs: false,
              },
            ],
          },
        ],
      });
      expect(config.rights).toHaveLength(2);
    });

    it("should parse filterCond as string", () => {
      const config = RecordPermissionConfigParser.parse({
        rights: [
          {
            filterCond: 'status = "active"',
            entities: [],
          },
        ],
      });
      expect(config.rights[0].filterCond).toBe('status = "active"');
    });
  });
});
