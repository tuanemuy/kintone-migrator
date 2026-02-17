import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import { ProcessManagementErrorCode } from "../../errorCode";
import { ProcessManagementConfigParser } from "../configParser";

describe("ProcessManagementConfigParser", () => {
  describe("正常系", () => {
    it("有効なYAMLをパースする（states + actions + enable）", () => {
      const yaml = `
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
  処理中:
    index: 1
    assignee:
      type: ALL
      entities:
        - type: GROUP
          code: group1
actions:
  - name: 承認
    from: 未処理
    to: 処理中
    filterCond: ""
`;
      const config = ProcessManagementConfigParser.parse(yaml);

      expect(config.enable).toBe(true);
      expect(Object.keys(config.states)).toHaveLength(2);
      expect(config.states["未処理"].index).toBe(0);
      expect(config.states["未処理"].assignee.type).toBe("ONE");
      expect(config.states["未処理"].assignee.entities).toHaveLength(1);
      expect(config.states["未処理"].assignee.entities[0].type).toBe("USER");
      expect(config.states["未処理"].assignee.entities[0].code).toBe("user1");
      expect(config.actions).toHaveLength(1);
      expect(config.actions[0].name).toBe("承認");
      expect(config.actions[0].from).toBe("未処理");
      expect(config.actions[0].to).toBe("処理中");
    });

    it("各種 entity type をパースする", () => {
      const yaml = `
enable: true
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
        - type: GROUP
          code: group1
        - type: ORGANIZATION
          code: org1
        - type: FIELD_ENTITY
          code: field1
        - type: CREATOR
        - type: CUSTOM_FIELD
          code: custom1
actions: []
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      const entities = config.states.state1.assignee.entities;

      expect(entities).toHaveLength(6);
      expect(entities[0].type).toBe("USER");
      expect(entities[1].type).toBe("GROUP");
      expect(entities[2].type).toBe("ORGANIZATION");
      expect(entities[3].type).toBe("FIELD_ENTITY");
      expect(entities[4].type).toBe("CREATOR");
      expect(entities[5].type).toBe("CUSTOM_FIELD");
    });

    it("includeSubs ありの entity をパースする", () => {
      const yaml = `
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: GROUP
          code: group1
          includeSubs: true
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      expect(config.states.state1.assignee.entities[0].includeSubs).toBe(true);
    });

    it("includeSubs なしの entity をパースする", () => {
      const yaml = `
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      expect(
        config.states.state1.assignee.entities[0].includeSubs,
      ).toBeUndefined();
    });

    it("空の entities 配列をパースする", () => {
      const yaml = `
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities: []
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      expect(config.states.state1.assignee.entities).toHaveLength(0);
    });

    it("enable 省略時にデフォルトで false になる", () => {
      const yaml = `
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities: []
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      expect(config.enable).toBe(false);
    });

    it("states/actions 省略時に空になる", () => {
      const yaml = `
enable: false
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      expect(Object.keys(config.states)).toHaveLength(0);
      expect(config.actions).toHaveLength(0);
    });

    it("SECONDARY タイプのアクションを executableUser 付きでパースする", () => {
      const yaml = `
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
  state2:
    index: 1
    assignee:
      type: ONE
      entities: []
actions:
  - name: 差し戻し
    from: state2
    to: state1
    type: SECONDARY
    executableUser:
      entities:
        - type: USER
          code: admin1
        - type: GROUP
          code: managers
          includeSubs: true
`;
      const config = ProcessManagementConfigParser.parse(yaml);

      expect(config.actions[0].type).toBe("SECONDARY");
      expect(config.actions[0].executableUser).toBeDefined();
      expect(config.actions[0].executableUser?.entities).toHaveLength(2);
      expect(config.actions[0].executableUser?.entities[0].type).toBe("USER");
      expect(config.actions[0].executableUser?.entities[0].code).toBe("admin1");
      expect(config.actions[0].executableUser?.entities[1].type).toBe("GROUP");
      expect(config.actions[0].executableUser?.entities[1].code).toBe(
        "managers",
      );
      expect(config.actions[0].executableUser?.entities[1].includeSubs).toBe(
        true,
      );
    });

    it("type 省略時にデフォルトで PRIMARY になる", () => {
      const yaml = `
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities: []
  state2:
    index: 1
    assignee:
      type: ONE
      entities: []
actions:
  - name: action1
    from: state1
    to: state2
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      expect(config.actions[0].type).toBe("PRIMARY");
      expect(config.actions[0].executableUser).toBeUndefined();
    });

    it("PRIMARY タイプのアクションでは executableUser が無視される", () => {
      const yaml = `
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities: []
  state2:
    index: 1
    assignee:
      type: ONE
      entities: []
actions:
  - name: action1
    from: state1
    to: state2
    type: PRIMARY
    executableUser:
      entities:
        - type: USER
          code: user1
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      expect(config.actions[0].type).toBe("PRIMARY");
      expect(config.actions[0].executableUser).toBeUndefined();
    });

    it("filterCond 省略時に空文字列になる", () => {
      const yaml = `
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities: []
  state2:
    index: 1
    assignee:
      type: ONE
      entities: []
actions:
  - name: action1
    from: state1
    to: state2
`;
      const config = ProcessManagementConfigParser.parse(yaml);
      expect(config.actions[0].filterCond).toBe("");
    });
  });

  describe("エラー系", () => {
    it("空テキストで PmEmptyConfigText エラー", () => {
      expect(() => ProcessManagementConfigParser.parse("")).toThrow();
      try {
        ProcessManagementConfigParser.parse("");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(ProcessManagementErrorCode.PmEmptyConfigText);
        }
      }
    });

    it("空白のみのテキストで PmEmptyConfigText エラー", () => {
      try {
        ProcessManagementConfigParser.parse("   \n  ");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(ProcessManagementErrorCode.PmEmptyConfigText);
        }
      }
    });

    it("無効なYAMLで PmInvalidConfigYaml エラー", () => {
      try {
        ProcessManagementConfigParser.parse("{ invalid: yaml:");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidConfigYaml,
          );
        }
      }
    });

    it("非オブジェクトで PmInvalidConfigStructure エラー", () => {
      try {
        ProcessManagementConfigParser.parse("just a string");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidConfigStructure,
          );
        }
      }
    });

    it("states が配列の場合に PmInvalidConfigStructure エラー", () => {
      try {
        ProcessManagementConfigParser.parse("states:\n  - item1");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidConfigStructure,
          );
        }
      }
    });

    it("actions が非配列の場合に PmInvalidConfigStructure エラー", () => {
      try {
        ProcessManagementConfigParser.parse("actions: not_array");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidConfigStructure,
          );
        }
      }
    });

    it("state に index がない場合に PmInvalidConfigStructure エラー", () => {
      try {
        ProcessManagementConfigParser.parse(`
states:
  state1:
    assignee:
      type: ONE
      entities: []
`);
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidConfigStructure,
          );
        }
      }
    });

    it("state に assignee がない場合に PmInvalidConfigStructure エラー", () => {
      try {
        ProcessManagementConfigParser.parse(`
states:
  state1:
    index: 0
`);
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidConfigStructure,
          );
        }
      }
    });

    it("無効な assignee.type で PmInvalidAssigneeType エラー", () => {
      try {
        ProcessManagementConfigParser.parse(`
states:
  state1:
    index: 0
    assignee:
      type: INVALID
      entities: []
`);
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidAssigneeType,
          );
        }
      }
    });

    it("無効な entity.type で PmInvalidEntityType エラー", () => {
      try {
        ProcessManagementConfigParser.parse(`
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: INVALID_TYPE
          code: user1
`);
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidEntityType,
          );
        }
      }
    });

    it("action の from が存在しないステータスの場合に PmInvalidActionReference エラー", () => {
      try {
        ProcessManagementConfigParser.parse(`
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities: []
actions:
  - name: action1
    from: nonexistent
    to: state1
`);
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidActionReference,
          );
        }
      }
    });

    it("action の to が存在しないステータスの場合に PmInvalidActionReference エラー", () => {
      try {
        ProcessManagementConfigParser.parse(`
states:
  state1:
    index: 0
    assignee:
      type: ONE
      entities: []
actions:
  - name: action1
    from: state1
    to: nonexistent
`);
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(
            ProcessManagementErrorCode.PmInvalidActionReference,
          );
        }
      }
    });
  });
});
