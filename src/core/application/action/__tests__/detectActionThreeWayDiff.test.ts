import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestActionContainer } from "@/core/application/__tests__/helpers";
import type { TestActionContainer } from "@/core/application/__tests__/helpers/action";
import type { ActionConfig, ActionsConfig } from "@/core/domain/action/entity";
import { ActionStateSerializer } from "@/core/domain/action/services/actionStateSerializer";
import { detectActionThreeWayDiff } from "../detectActionThreeWayDiff";

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

describe("detectActionThreeWayDiff", () => {
  const getContainer = setupTestActionContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.actionStorage.setContent(actionYaml("local"));
    container.actionConfigurator.setActions(baseConfig.actions, "1");

    const result = await detectActionThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml("local"));
    container.actionConfigurator.setActions(baseConfig.actions, "1");

    const result = await detectActionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toContain("見積作成");
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml(""));
    container.actionConfigurator.setActions(
      { 見積作成: action("見積作成", { filterCond: "remote" }) },
      "2",
    );

    const result = await detectActionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toContain("見積作成");
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml("local"));
    container.actionConfigurator.setActions(
      { 見積作成: action("見積作成", { filterCond: "remote" }) },
      "2",
    );

    const result = await detectActionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toContain("見積作成");
    }
  });
});
