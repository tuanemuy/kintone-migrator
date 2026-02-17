import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { ActionErrorCode } from "../../errorCode";
import { ActionConfigParser } from "../configParser";

describe("ActionConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple actions", () => {
      const yaml = `
actions:
  見積書を作成:
    index: 0
    destApp:
      code: estimate-app
    mappings:
      - srcType: FIELD
        srcField: 顧客名
        destField: 顧客名
      - srcType: RECORD_URL
        destField: 元レコード
    entities:
      - type: GROUP
        code: everyone
    filterCond: ""
  請求書を作成:
    index: 1
    destApp:
      app: "42"
      code: invoice-app
    mappings:
      - srcType: FIELD
        srcField: 金額
        destField: 請求金額
    entities:
      - type: USER
        code: admin
      - type: ORGANIZATION
        code: sales
    filterCond: "status = \\"完了\\""
`;
      const config = ActionConfigParser.parse(yaml);

      expect(Object.keys(config.actions)).toHaveLength(2);

      const action1 = config.actions["見積書を作成"];
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

      const action2 = config.actions["請求書を作成"];
      expect(action2.name).toBe("請求書を作成");
      expect(action2.index).toBe(1);
      expect(action2.destApp).toEqual({ app: "42", code: "invoice-app" });
      expect(action2.entities).toHaveLength(2);
    });

    it("should derive name from YAML key", () => {
      const yaml = `
actions:
  テストアクション:
    index: 0
    destApp:
      code: target-app
    mappings: []
    entities: []
`;
      const config = ActionConfigParser.parse(yaml);

      expect(config.actions["テストアクション"].name).toBe("テストアクション");
    });

    it("should parse config with empty mappings and entities", () => {
      const yaml = `
actions:
  empty-action:
    index: 0
    destApp:
      code: target-app
    mappings: []
    entities: []
`;
      const config = ActionConfigParser.parse(yaml);

      expect(config.actions["empty-action"].mappings).toHaveLength(0);
      expect(config.actions["empty-action"].entities).toHaveLength(0);
    });

    it("should default filterCond to empty string when missing", () => {
      const yaml = `
actions:
  test:
    index: 0
    destApp:
      code: target-app
    mappings: []
    entities: []
`;
      const config = ActionConfigParser.parse(yaml);

      expect(config.actions["test"].filterCond).toBe("");
    });

    it("should throw AcEmptyConfigText for empty text", () => {
      expect(() => ActionConfigParser.parse("")).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcEmptyConfigText,
        }),
      );
    });

    it("should throw AcEmptyConfigText for whitespace-only text", () => {
      expect(() => ActionConfigParser.parse("   \n  ")).toThrow(
        BusinessRuleError,
      );
      expect(() => ActionConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcEmptyConfigText,
        }),
      );
    });

    it("should throw AcInvalidConfigYaml for invalid YAML", () => {
      expect(() => ActionConfigParser.parse("{ invalid: yaml:")).toThrow(
        BusinessRuleError,
      );
      expect(() => ActionConfigParser.parse("{ invalid: yaml:")).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigYaml,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for non-object YAML", () => {
      expect(() => ActionConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => ActionConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure when actions is missing", () => {
      const yaml = `
someOtherKey: value
`;
      expect(() => ActionConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidSrcType for invalid srcType", () => {
      const yaml = `
actions:
  test:
    index: 0
    destApp:
      code: target-app
    mappings:
      - srcType: INVALID
        destField: field1
    entities: []
`;
      expect(() => ActionConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidSrcType,
        }),
      );
    });

    it("should throw AcInvalidEntityType for invalid entity type", () => {
      const yaml = `
actions:
  test:
    index: 0
    destApp:
      code: target-app
    mappings: []
    entities:
      - type: INVALID
        code: user1
`;
      expect(() => ActionConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidEntityType,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for missing destApp", () => {
      const yaml = `
actions:
  test:
    index: 0
    mappings: []
    entities: []
`;
      expect(() => ActionConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for missing index", () => {
      const yaml = `
actions:
  test:
    destApp:
      code: target-app
    mappings: []
    entities: []
`;
      expect(() => ActionConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for empty destField in mapping", () => {
      const yaml = `
actions:
  test:
    index: 0
    destApp:
      code: target-app
    mappings:
      - srcType: FIELD
        srcField: src
        destField: ""
    entities: []
`;
      expect(() => ActionConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });

    it("should throw AcInvalidConfigStructure for empty entity code", () => {
      const yaml = `
actions:
  test:
    index: 0
    destApp:
      code: target-app
    mappings: []
    entities:
      - type: USER
        code: ""
`;
      expect(() => ActionConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ActionConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: ActionErrorCode.AcInvalidConfigStructure,
        }),
      );
    });
  });
});
