import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { ActionErrorCode } from "../../errorCode";
import { ActionConfigParser } from "../configParser";

describe("ActionConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple actions", () => {
      const config = ActionConfigParser.parse({
        actions: {
          見積書を作成: {
            index: 0,
            destApp: {
              code: "estimate-app",
            },
            mappings: [
              {
                srcType: "FIELD",
                srcField: "顧客名",
                destField: "顧客名",
              },
              {
                srcType: "RECORD_URL",
                destField: "元レコード",
              },
            ],
            entities: [
              {
                type: "GROUP",
                code: "everyone",
              },
            ],
            filterCond: "",
          },
          請求書を作成: {
            index: 1,
            destApp: {
              app: "42",
              code: "invoice-app",
            },
            mappings: [
              {
                srcType: "FIELD",
                srcField: "金額",
                destField: "請求金額",
              },
            ],
            entities: [
              {
                type: "USER",
                code: "admin",
              },
              {
                type: "ORGANIZATION",
                code: "sales",
              },
            ],
            filterCond: 'status = "完了"',
          },
        },
      });

      expect(Object.keys(config.actions)).toHaveLength(2);

      const action1 = config.actions.見積書を作成;
      expect(action1.name).toBe("見積書を作成");
      expect(action1.index).toBe(0);
      expect(action1.destApp).toEqual({ code: "estimate-app" });
      expect(action1.mappings).toHaveLength(2);
      expect(action1.mappings[0]).toEqual({
        srcType: "FIELD",
        srcField: "顧客名",
        destField: "顧客名",
      });
      expect(action1.mappings[1]).toEqual({
        srcType: "RECORD_URL",
        destField: "元レコード",
      });
      expect(action1.entities).toHaveLength(1);
      expect(action1.entities[0]).toEqual({ type: "GROUP", code: "everyone" });
      expect(action1.filterCond).toBe("");

      const action2 = config.actions.請求書を作成;
      expect(action2.name).toBe("請求書を作成");
      expect(action2.index).toBe(1);
      expect(action2.destApp).toEqual({ app: "42", code: "invoice-app" });
      expect(action2.entities).toHaveLength(2);
    });

    it("should derive name from key", () => {
      const config = ActionConfigParser.parse({
        actions: {
          テストアクション: {
            index: 0,
            destApp: {
              code: "target-app",
            },
            mappings: [],
            entities: [],
          },
        },
      });

      expect(config.actions.テストアクション.name).toBe("テストアクション");
    });

    it("should parse config with empty mappings and entities", () => {
      const config = ActionConfigParser.parse({
        actions: {
          "empty-action": {
            index: 0,
            destApp: {
              code: "target-app",
            },
            mappings: [],
            entities: [],
          },
        },
      });

      expect(config.actions["empty-action"].mappings).toHaveLength(0);
      expect(config.actions["empty-action"].entities).toHaveLength(0);
    });

    it("should default filterCond to empty string when missing", () => {
      const config = ActionConfigParser.parse({
        actions: {
          test: {
            index: 0,
            destApp: {
              code: "target-app",
            },
            mappings: [],
            entities: [],
          },
        },
      });

      expect(config.actions.test.filterCond).toBe("");
    });

    it("should throw AcInvalidConfigStructure for non-object input", () => {
      expect(() => ActionConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => ActionConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for array input", () => {
      expect(() => ActionConfigParser.parse(["item1"])).toThrow(
        BusinessRuleError,
      );
      expect(() => ActionConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for null input", () => {
      expect(() => ActionConfigParser.parse(null)).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure when actions is missing", () => {
      expect(() => ActionConfigParser.parse({ someOtherKey: "value" })).toThrow(
        BusinessRuleError,
      );
      expect(() => ActionConfigParser.parse({ someOtherKey: "value" })).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidSrcType for invalid srcType", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [{ srcType: "INVALID", destField: "field1" }],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [{ srcType: "INVALID", destField: "field1" }],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidSrcType,
        }),
      );
    });

    it("should throw AcInvalidEntityType for invalid entity type", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [{ type: "INVALID", code: "user1" }],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [{ type: "INVALID", code: "user1" }],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidEntityType,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for missing destApp", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for missing index", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              destApp: { code: "target-app" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              destApp: { code: "target-app" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for empty destField in mapping", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [{ srcType: "FIELD", srcField: "src", destField: "" }],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [{ srcType: "FIELD", srcField: "src", destField: "" }],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for empty entity code", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [{ type: "USER", code: "" }],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [{ type: "USER", code: "" }],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object action value", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: "not_an_object",
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: "not_an_object",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-array mappings", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: "not_an_array",
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: "not_an_array",
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-array entities", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: "not_an_array",
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: "not_an_array",
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object mapping", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: ["not_an_object"],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: ["not_an_object"],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object entity", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: ["not_an_object"],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: ["not_an_object"],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should parse destApp with app only", () => {
      const config = ActionConfigParser.parse({
        actions: {
          test: {
            index: 0,
            destApp: { app: "123" },
            mappings: [],
            entities: [],
          },
        },
      });
      expect(config.actions.test.destApp).toEqual({ app: "123" });
    });

    it("should parse destApp with both app and code", () => {
      const config = ActionConfigParser.parse({
        actions: {
          test: {
            index: 0,
            destApp: { app: "123", code: "my-app" },
            mappings: [],
            entities: [],
          },
        },
      });
      expect(config.actions.test.destApp).toEqual({
        app: "123",
        code: "my-app",
      });
    });

    it("should parse mapping with srcField omitted for RECORD_URL", () => {
      const config = ActionConfigParser.parse({
        actions: {
          test: {
            index: 0,
            destApp: { code: "target-app" },
            mappings: [{ srcType: "RECORD_URL", destField: "url_field" }],
            entities: [],
          },
        },
      });
      expect(config.actions.test.mappings[0].srcField).toBeUndefined();
    });

    it("should throw AcEmptyActionName for empty action key", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            "": {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            "": {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcEmptyActionName,
        }),
      );
    });

    it("should parse empty actions object", () => {
      const config = ActionConfigParser.parse({
        actions: {},
      });
      expect(Object.keys(config.actions)).toHaveLength(0);
    });

    it("should throw for empty destApp object (both app and code missing)", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: {},
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: {},
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw for srcType FIELD without srcField", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [{ srcType: "FIELD", destField: "field1" }],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "target-app" },
              mappings: [{ srcType: "FIELD", destField: "field1" }],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw for negative index", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: -1,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: -1,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw for fractional index", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 1.5,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 1.5,
              destApp: { code: "target-app" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcDuplicateIndex for duplicate index values across actions", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            action1: {
              index: 0,
              destApp: { code: "app1" },
              mappings: [],
              entities: [],
            },
            action2: {
              index: 0,
              destApp: { code: "app2" },
              mappings: [],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcDuplicateIndex,
        }),
      );
    });

    it("should coerce numeric destApp.app to string", () => {
      const config = ActionConfigParser.parse({
        actions: {
          test: {
            index: 0,
            destApp: { app: 123 },
            mappings: [],
            entities: [],
          },
        },
      });
      expect(config.actions.test.destApp.app).toBe("123");
    });

    it("should treat non-string srcField with srcType FIELD as missing", () => {
      expect(() =>
        ActionConfigParser.parse({
          actions: {
            test: {
              index: 0,
              destApp: { code: "app" },
              mappings: [
                { srcType: "FIELD", srcField: 123, destField: "field1" },
              ],
              entities: [],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });
  });
});
