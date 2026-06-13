import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestActionContainer } from "@/core/application/__tests__/helpers";
import type { TestActionContainer } from "@/core/application/__tests__/helpers/action";
import type { ActionConfig, ActionsConfig } from "@/core/domain/action/entity";
import { ActionStateSerializer } from "@/core/domain/action/services/actionStateSerializer";
import { applyPulledActionMerge, pullAction } from "../pullAction";

function action(
  name: string,
  overrides: Partial<ActionConfig> = {},
): ActionConfig {
  return {
    index: 0,
    name,
    destApp: { code: "DEST" },
    mappings: [],
    entities: [],
    filterCond: "",
    ...overrides,
  };
}

function actionYaml(filterCond: string): string {
  return `actions:\n  見積作成:\n    index: 0\n    destApp:\n      code: DEST\n    mappings: []\n    entities: []\n    filterCond: "${filterCond}"\n`;
}

function setState(
  container: TestActionContainer,
  config: ActionsConfig,
  revision: string,
): void {
  container.actionStateStorage.setContent(
    configCodec.stringify(ActionStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

const baseConfig: ActionsConfig = {
  actions: { 見積作成: action("見積作成", { filterCond: "" }) },
};

describe("pullAction", () => {
  const getContainer = setupTestActionContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.actionConfigurator.setActions(
      { 見積作成: action("見積作成", { filterCond: "remote" }) },
      "7",
    );

    const result = await pullAction({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.actionStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml("local"));
    container.actionConfigurator.setActions(
      { 見積作成: action("見積作成", { filterCond: "remote" }) },
      "2",
    );

    const result = await pullAction({ container, input: { force: true } });

    expect(result.mode).toBe("force");
  });

  it("returns the merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml("local"));
    container.actionConfigurator.setActions(
      { 見積作成: action("見積作成", { filterCond: "remote" }) },
      "2",
    );

    const result = await pullAction({ container, input: {} });

    expect(result.mode).toBe("merged");
    expect(container.actionStorage.callLog).not.toContain("update");
    expect(container.actionStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledActionMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml("local"));
    const remoteConfig: ActionsConfig = {
      actions: { 見積作成: action("見積作成", { filterCond: "remote" }) },
    };
    container.actionConfigurator.setActions(remoteConfig.actions, "2");

    const pull = await pullAction({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledActionMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: new Map([["見積作成", "remote"]]),
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.actionStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
