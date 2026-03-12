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

      const result = ActionConfigSerializer.serialize(config);

      expect(result).toHaveProperty("actions");
      const actions = result.actions as Record<string, Record<string, unknown>>;
      expect(actions).toHaveProperty("見積書を作成");

      const action = actions.見積書を作成;
      const destApp = action.destApp as Record<string, unknown>;
      expect(destApp.code).toBe("estimate-app");

      const mappings = action.mappings as Record<string, unknown>[];
      expect(mappings[0].srcType).toBe("FIELD");
      expect(mappings[1].srcType).toBe("RECORD_URL");

      const entities = action.entities as Record<string, unknown>[];
      expect(entities[0].code).toBe("everyone");
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

      const result = ActionConfigSerializer.serialize(config);
      const actions = result.actions as Record<string, Record<string, unknown>>;
      const action = actions.test;

      expect(action).not.toHaveProperty("name");
    });

    it("should serialize config with empty actions", () => {
      const config: ActionsConfig = {
        actions: {},
      };

      const result = ActionConfigSerializer.serialize(config);

      expect(result.actions).toEqual({});
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

      const result = ActionConfigSerializer.serialize(config);
      const actions = result.actions as Record<string, Record<string, unknown>>;
      const destApp = actions.test.destApp as Record<string, unknown>;

      expect(destApp.app).toBe("42");
      expect(destApp.code).toBe("my-app");
    });

    it("should roundtrip parse and serialize", () => {
      const input = {
        actions: {
          見積書を作成: {
            index: 0,
            destApp: {
              code: "estimate-app",
            },
            mappings: [
              { srcType: "FIELD", srcField: "顧客名", destField: "顧客名" },
              { srcType: "RECORD_URL", destField: "元レコード" },
            ],
            entities: [{ type: "GROUP", code: "everyone" }],
            filterCond: "",
          },
          請求書を作成: {
            index: 1,
            destApp: {
              code: "invoice-app",
            },
            mappings: [
              { srcType: "FIELD", srcField: "金額", destField: "請求金額" },
            ],
            entities: [
              { type: "USER", code: "admin" },
              { type: "ORGANIZATION", code: "sales" },
            ],
            filterCond: 'status = "完了"',
          },
        },
      };
      const parsed = ActionConfigParser.parse(input);
      const serialized = ActionConfigSerializer.serialize(parsed);
      const reparsed = ActionConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
