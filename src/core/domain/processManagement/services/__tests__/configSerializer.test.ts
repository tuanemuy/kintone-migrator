import { describe, expect, it } from "vitest";
import type { ProcessManagementConfig } from "../../entity";
import { ProcessManagementConfigParser } from "../configParser";
import { ProcessManagementConfigSerializer } from "../configSerializer";

describe("ProcessManagementConfigSerializer", () => {
  it("should serialize states and actions", () => {
    const config: ProcessManagementConfig = {
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
          type: "PRIMARY",
        },
      ],
    };

    const result = ProcessManagementConfigSerializer.serialize(config);

    expect(result.enable).toBe(true);

    const states = result.states as Record<string, Record<string, unknown>>;
    expect(states).toHaveProperty("未処理");
    expect(states).toHaveProperty("処理中");

    const state1 = states["未処理"];
    const assignee1 = state1.assignee as Record<string, unknown>;
    const entities1 = assignee1.entities as Record<string, unknown>[];
    expect(entities1[0].code).toBe("user1");

    const state2 = states["処理中"];
    const assignee2 = state2.assignee as Record<string, unknown>;
    const entities2 = assignee2.entities as Record<string, unknown>[];
    expect(entities2[0].code).toBe("group1");

    const actions = result.actions as Record<string, unknown>[];
    expect(actions[0].name).toBe("承認");
  });

  it("should serialize entity with includeSubs", () => {
    const config: ProcessManagementConfig = {
      enable: true,
      states: {
        state1: {
          index: 0,
          assignee: {
            type: "ONE",
            entities: [{ type: "GROUP", code: "group1", includeSubs: true }],
          },
        },
      },
      actions: [],
    };

    const result = ProcessManagementConfigSerializer.serialize(config);
    const states = result.states as Record<string, Record<string, unknown>>;
    const assignee = states.state1.assignee as Record<string, unknown>;
    const entities = assignee.entities as Record<string, unknown>[];

    expect(entities[0].includeSubs).toBe(true);
  });

  it("should serialize entity without includeSubs", () => {
    const config: ProcessManagementConfig = {
      enable: true,
      states: {
        state1: {
          index: 0,
          assignee: {
            type: "ONE",
            entities: [{ type: "USER", code: "user1" }],
          },
        },
      },
      actions: [],
    };

    const result = ProcessManagementConfigSerializer.serialize(config);
    const states = result.states as Record<string, Record<string, unknown>>;
    const assignee = states.state1.assignee as Record<string, unknown>;
    const entities = assignee.entities as Record<string, unknown>[];

    expect(entities[0]).not.toHaveProperty("includeSubs");
  });

  it("should serialize empty states and actions", () => {
    const config: ProcessManagementConfig = {
      enable: false,
      states: {},
      actions: [],
    };

    const result = ProcessManagementConfigSerializer.serialize(config);

    expect(result.enable).toBe(false);
    expect(result).toHaveProperty("states");
    expect(result).toHaveProperty("actions");
  });

  it("should serialize enable: false", () => {
    const config: ProcessManagementConfig = {
      enable: false,
      states: {},
      actions: [],
    };

    const result = ProcessManagementConfigSerializer.serialize(config);
    expect(result.enable).toBe(false);
  });

  it("should serialize SECONDARY action with executableUser", () => {
    const config: ProcessManagementConfig = {
      enable: true,
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
          filterCond: "",
          type: "SECONDARY",
          executableUser: {
            entities: [
              { type: "USER", code: "admin1" },
              { type: "GROUP", code: "managers", includeSubs: true },
            ],
          },
        },
      ],
    };

    const result = ProcessManagementConfigSerializer.serialize(config);
    const actions = result.actions as Record<string, unknown>[];
    const action = actions[0];

    expect(action.type).toBe("SECONDARY");
    expect(action).toHaveProperty("executableUser");

    const executableUser = action.executableUser as Record<string, unknown>;
    const entities = executableUser.entities as Record<string, unknown>[];
    expect(entities[0].code).toBe("admin1");
    expect(entities[1].code).toBe("managers");
    expect(entities[1].includeSubs).toBe(true);
  });

  it("should roundtrip SECONDARY action", () => {
    const original: ProcessManagementConfig = {
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
            entities: [{ type: "ORGANIZATION", code: "org1" }],
          },
        },
      },
      actions: [
        {
          name: "承認",
          from: "未処理",
          to: "処理中",
          filterCond: "",
          type: "PRIMARY",
        },
        {
          name: "差し戻し",
          from: "処理中",
          to: "未処理",
          filterCond: "",
          type: "SECONDARY",
          executableUser: {
            entities: [
              { type: "USER", code: "admin1" },
              { type: "GROUP", code: "managers", includeSubs: true },
            ],
          },
        },
      ],
    };

    const result1 = ProcessManagementConfigSerializer.serialize(original);
    const parsed = ProcessManagementConfigParser.parse(result1);
    const result2 = ProcessManagementConfigSerializer.serialize(parsed);

    expect(result1).toEqual(result2);
    expect(parsed.actions[1].type).toBe("SECONDARY");
    expect(parsed.actions[1].executableUser?.entities).toHaveLength(2);
  });

  it("should roundtrip serialize -> parse -> serialize", () => {
    const original: ProcessManagementConfig = {
      enable: true,
      states: {
        未処理: {
          index: 0,
          assignee: {
            type: "ONE",
            entities: [
              { type: "USER", code: "user1" },
              { type: "GROUP", code: "group1", includeSubs: true },
            ],
          },
        },
        処理中: {
          index: 1,
          assignee: {
            type: "ALL",
            entities: [{ type: "ORGANIZATION", code: "org1" }],
          },
        },
      },
      actions: [
        {
          name: "承認",
          from: "未処理",
          to: "処理中",
          filterCond: 'status = "active"',
          type: "PRIMARY",
        },
      ],
    };

    const result1 = ProcessManagementConfigSerializer.serialize(original);
    const parsed = ProcessManagementConfigParser.parse(result1);
    const result2 = ProcessManagementConfigSerializer.serialize(parsed);

    expect(result1).toEqual(result2);
  });
});
