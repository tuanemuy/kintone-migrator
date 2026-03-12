import { describe, expect, it } from "vitest";
import { ProcessManagementErrorCode } from "../../errorCode";
import { ProcessManagementConfigParser } from "../configParser";

describe("ProcessManagementConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid input with states, actions, and enable", () => {
      const config = ProcessManagementConfigParser.parse({
        enable: true,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          処理中: {
            index: 1,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          },
        },
        actions: [
          {
            name: "承認",
            from: "未処理",
            to: "処理中",
            filterCond: "",
          },
        ],
      });

      expect(config.enable).toBe(true);
      expect(Object.keys(config.states)).toHaveLength(2);
      expect(config.states.未処理.index).toBe(0);
      expect(config.states.未処理.assignee.type).toBe("ONE");
      expect(config.states.未処理.assignee.entities).toHaveLength(1);
      expect(config.states.未処理.assignee.entities[0].type).toBe("USER");
      expect(config.states.未処理.assignee.entities[0].code).toBe("user1");
      expect(config.actions).toHaveLength(1);
      expect(config.actions[0].name).toBe("承認");
      expect(config.actions[0].from).toBe("未処理");
      expect(config.actions[0].to).toBe("処理中");
    });

    it("should parse all entity types", () => {
      const config = ProcessManagementConfigParser.parse({
        enable: true,
        states: {
          state1: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [
                { type: "USER", code: "user1" },
                { type: "GROUP", code: "group1" },
                { type: "ORGANIZATION", code: "org1" },
                { type: "FIELD_ENTITY", code: "field1" },
                { type: "CREATOR" },
                { type: "CUSTOM_FIELD", code: "custom1" },
              ],
            },
          },
        },
        actions: [],
      });
      const entities = config.states.state1.assignee.entities;

      expect(entities).toHaveLength(6);
      expect(entities[0].type).toBe("USER");
      expect(entities[1].type).toBe("GROUP");
      expect(entities[2].type).toBe("ORGANIZATION");
      expect(entities[3].type).toBe("FIELD_ENTITY");
      expect(entities[4].type).toBe("CREATOR");
      expect(entities[5].type).toBe("CUSTOM_FIELD");
    });

    it("should parse entity with includeSubs", () => {
      const config = ProcessManagementConfigParser.parse({
        states: {
          state1: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "GROUP", code: "group1", includeSubs: true }],
            },
          },
        },
      });
      expect(config.states.state1.assignee.entities[0].includeSubs).toBe(true);
    });

    it("should parse entity without includeSubs", () => {
      const config = ProcessManagementConfigParser.parse({
        states: {
          state1: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
        },
      });
      expect(
        config.states.state1.assignee.entities[0].includeSubs,
      ).toBeUndefined();
    });

    it("should parse empty entities array", () => {
      const config = ProcessManagementConfigParser.parse({
        states: {
          state1: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [],
            },
          },
        },
      });
      expect(config.states.state1.assignee.entities).toHaveLength(0);
    });

    it("should default enable to false when omitted", () => {
      const config = ProcessManagementConfigParser.parse({
        states: {
          state1: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [],
            },
          },
        },
      });
      expect(config.enable).toBe(false);
    });

    it("should default states and actions to empty when omitted", () => {
      const config = ProcessManagementConfigParser.parse({
        enable: false,
      });
      expect(Object.keys(config.states)).toHaveLength(0);
      expect(config.actions).toHaveLength(0);
    });

    it("should parse SECONDARY action with executableUser", () => {
      const config = ProcessManagementConfigParser.parse({
        states: {
          state1: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          state2: {
            index: 1,
            assignee: {
              type: "ONE",
              entities: [],
            },
          },
        },
        actions: [
          {
            name: "差し戻し",
            from: "state2",
            to: "state1",
            type: "SECONDARY",
            executableUser: {
              entities: [
                { type: "USER", code: "admin1" },
                { type: "GROUP", code: "managers", includeSubs: true },
              ],
            },
          },
        ],
      });

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

    it("should default action type to PRIMARY when omitted", () => {
      const config = ProcessManagementConfigParser.parse({
        states: {
          state1: {
            index: 0,
            assignee: { type: "ONE", entities: [] },
          },
          state2: {
            index: 1,
            assignee: { type: "ONE", entities: [] },
          },
        },
        actions: [{ name: "action1", from: "state1", to: "state2" }],
      });
      expect(config.actions[0].type).toBe("PRIMARY");
      expect(config.actions[0].executableUser).toBeUndefined();
    });

    it("should ignore executableUser on PRIMARY action", () => {
      const config = ProcessManagementConfigParser.parse({
        states: {
          state1: {
            index: 0,
            assignee: { type: "ONE", entities: [] },
          },
          state2: {
            index: 1,
            assignee: { type: "ONE", entities: [] },
          },
        },
        actions: [
          {
            name: "action1",
            from: "state1",
            to: "state2",
            type: "PRIMARY",
            executableUser: {
              entities: [{ type: "USER", code: "user1" }],
            },
          },
        ],
      });
      expect(config.actions[0].type).toBe("PRIMARY");
      expect(config.actions[0].executableUser).toBeUndefined();
    });

    it("should default filterCond to empty string when omitted", () => {
      const config = ProcessManagementConfigParser.parse({
        states: {
          state1: {
            index: 0,
            assignee: { type: "ONE", entities: [] },
          },
          state2: {
            index: 1,
            assignee: { type: "ONE", entities: [] },
          },
        },
        actions: [{ name: "action1", from: "state1", to: "state2" }],
      });
      expect(config.actions[0].filterCond).toBe("");
    });
  });

  describe("error cases", () => {
    it("should throw PmInvalidConfigStructure for non-object input", () => {
      expect(() =>
        ProcessManagementConfigParser.parse("just a string"),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure for array input", () => {
      expect(() => ProcessManagementConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure for null input", () => {
      expect(() => ProcessManagementConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when states is an array", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({ states: ["item1"] }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when actions is not an array", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({ actions: "not_array" }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when state has no index", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              assignee: { type: "ONE", entities: [] },
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when state has no assignee", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: { index: 0 },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidAssigneeType for invalid assignee type", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "INVALID", entities: [] },
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidAssigneeType,
        }),
      );
    });

    it("should throw PmInvalidEntityType for invalid entity type", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: {
                type: "ONE",
                entities: [{ type: "INVALID_TYPE", code: "user1" }],
              },
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidEntityType,
        }),
      );
    });

    it("should throw PmInvalidActionReference when action from references nonexistent state", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [{ name: "action1", from: "nonexistent", to: "state1" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidActionReference,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when action is not an object", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: ["not_an_object"],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when action has no name", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [{ from: "state1", to: "state1" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when action has no from", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [{ name: "action1", to: "state1" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when action has no to", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [{ name: "action1", from: "state1" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure for invalid action type", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
            state2: {
              index: 1,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [
            {
              name: "action1",
              from: "state1",
              to: "state2",
              type: "INVALID",
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when assignee is not an object", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: "not_an_object",
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when assignee has no entities", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE" },
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when entity is not an object", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: {
                type: "ONE",
                entities: ["not_an_object"],
              },
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when state is not an object", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: "not_an_object",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when SECONDARY executableUser is not an object", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
            state2: {
              index: 1,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [
            {
              name: "action1",
              from: "state1",
              to: "state2",
              type: "SECONDARY",
              executableUser: "not_an_object",
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidConfigStructure when SECONDARY executableUser.entities is not an array", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
            state2: {
              index: 1,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [
            {
              name: "action1",
              from: "state1",
              to: "state2",
              type: "SECONDARY",
              executableUser: {
                entities: "not_an_array",
              },
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidConfigStructure,
        }),
      );
    });

    it("should throw PmInvalidActionReference when action to references nonexistent state", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [{ name: "action1", from: "state1", to: "nonexistent" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidActionReference,
        }),
      );
    });

    it("should throw PmDuplicateActionName for duplicate action names", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({
          states: {
            state1: {
              index: 0,
              assignee: { type: "ONE", entities: [] },
            },
            state2: {
              index: 1,
              assignee: { type: "ONE", entities: [] },
            },
          },
          actions: [
            { name: "action1", from: "state1", to: "state2" },
            { name: "action1", from: "state2", to: "state1" },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmDuplicateActionName,
        }),
      );
    });

    it("should throw PmInvalidBooleanField for non-boolean enable value", () => {
      expect(() =>
        ProcessManagementConfigParser.parse({ enable: "yes" }),
      ).toThrow(
        expect.objectContaining({
          code: ProcessManagementErrorCode.PmInvalidBooleanField,
        }),
      );
    });
  });
});
