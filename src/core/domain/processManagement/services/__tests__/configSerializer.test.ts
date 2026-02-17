import { describe, expect, it } from "vitest";
import type { ProcessManagementConfig } from "../../entity";
import { ProcessManagementConfigParser } from "../configParser";
import { ProcessManagementConfigSerializer } from "../configSerializer";

describe("ProcessManagementConfigSerializer", () => {
  it("states と actions をシリアライズする", () => {
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

    const yaml = ProcessManagementConfigSerializer.serialize(config);

    expect(yaml).toContain("enable: true");
    expect(yaml).toContain("未処理");
    expect(yaml).toContain("処理中");
    expect(yaml).toContain("user1");
    expect(yaml).toContain("group1");
    expect(yaml).toContain("承認");
  });

  it("includeSubs ありの entity をシリアライズする", () => {
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

    const yaml = ProcessManagementConfigSerializer.serialize(config);
    expect(yaml).toContain("includeSubs: true");
  });

  it("includeSubs なしの entity をシリアライズする", () => {
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

    const yaml = ProcessManagementConfigSerializer.serialize(config);
    expect(yaml).not.toContain("includeSubs");
  });

  it("空の states/actions をシリアライズする", () => {
    const config: ProcessManagementConfig = {
      enable: false,
      states: {},
      actions: [],
    };

    const yaml = ProcessManagementConfigSerializer.serialize(config);
    expect(yaml).toContain("enable: false");
    expect(yaml).toContain("states:");
    expect(yaml).toContain("actions:");
  });

  it("enable: false をシリアライズする", () => {
    const config: ProcessManagementConfig = {
      enable: false,
      states: {},
      actions: [],
    };

    const yaml = ProcessManagementConfigSerializer.serialize(config);
    expect(yaml).toContain("enable: false");
  });

  it("SECONDARY タイプのアクションを executableUser 付きでシリアライズする", () => {
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

    const yaml = ProcessManagementConfigSerializer.serialize(config);

    expect(yaml).toContain("type: SECONDARY");
    expect(yaml).toContain("executableUser");
    expect(yaml).toContain("admin1");
    expect(yaml).toContain("managers");
    expect(yaml).toContain("includeSubs: true");
  });

  it("SECONDARY アクションのラウンドトリップ", () => {
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

    const yaml1 = ProcessManagementConfigSerializer.serialize(original);
    const parsed = ProcessManagementConfigParser.parse(yaml1);
    const yaml2 = ProcessManagementConfigSerializer.serialize(parsed);

    expect(yaml1).toBe(yaml2);
    expect(parsed.actions[1].type).toBe("SECONDARY");
    expect(parsed.actions[1].executableUser?.entities).toHaveLength(2);
  });

  it("ラウンドトリップ（serialize → parse → serialize で一致確認）", () => {
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

    const yaml1 = ProcessManagementConfigSerializer.serialize(original);
    const parsed = ProcessManagementConfigParser.parse(yaml1);
    const yaml2 = ProcessManagementConfigSerializer.serialize(parsed);

    expect(yaml1).toBe(yaml2);
  });
});
