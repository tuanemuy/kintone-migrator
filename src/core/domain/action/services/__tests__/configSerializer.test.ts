import { describe, expect, it } from "vitest";
import type { ActionsConfig } from "../../entity";
import { ActionConfigParser } from "../configParser";
import { ActionConfigSerializer } from "../configSerializer";

describe("ActionConfigSerializer", () => {
  describe("serialize", () => {
    it("should serialize config with multiple actions", () => {
      const config: ActionsConfig = {
        actions: {
          見積書を作成: {
            index: 0,
            name: "見積書を作成",
            destApp: { code: "estimate-app" },
            mappings: [
              { srcType: "FIELD", srcField: "顧客名", destField: "顧客名" },
              { srcType: "RECORD_URL", destField: "元レコード" },
            ],
            entities: [{ type: "GROUP", code: "everyone" }],
            filterCond: "",
          },
        },
      };

      const yaml = ActionConfigSerializer.serialize(config);

      expect(yaml).toContain("見積書を作成");
      expect(yaml).toContain("estimate-app");
      expect(yaml).toContain("FIELD");
      expect(yaml).toContain("RECORD_URL");
      expect(yaml).toContain("everyone");
    });

    it("should not include name property in serialized output", () => {
      const config: ActionsConfig = {
        actions: {
          test: {
            index: 0,
            name: "test",
            destApp: { code: "app" },
            mappings: [],
            entities: [],
            filterCond: "",
          },
        },
      };

      const yaml = ActionConfigSerializer.serialize(config);
      const lines = yaml.split("\n");
      const nameLines = lines.filter((line) => line.trim().startsWith("name:"));

      expect(nameLines).toHaveLength(0);
    });

    it("should serialize config with empty actions", () => {
      const config: ActionsConfig = {
        actions: {},
      };

      const yaml = ActionConfigSerializer.serialize(config);

      expect(yaml).toContain("actions: {}");
    });

    it("should serialize destApp with both app and code", () => {
      const config: ActionsConfig = {
        actions: {
          test: {
            index: 0,
            name: "test",
            destApp: { app: "42", code: "my-app" },
            mappings: [],
            entities: [],
            filterCond: "",
          },
        },
      };

      const yaml = ActionConfigSerializer.serialize(config);

      expect(yaml).toContain('app: "42"');
      expect(yaml).toContain("code: my-app");
    });

    it("should roundtrip parse and serialize", () => {
      const originalYaml = `
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
    filterCond: status = "完了"
`;
      const parsed = ActionConfigParser.parse(originalYaml);
      const serialized = ActionConfigSerializer.serialize(parsed);
      const reparsed = ActionConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
