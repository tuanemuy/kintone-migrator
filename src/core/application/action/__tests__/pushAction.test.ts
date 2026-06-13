import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestActionContainer } from "@/core/application/__tests__/helpers";
import type { TestActionContainer } from "@/core/application/__tests__/helpers/action";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type { ActionConfig, ActionsConfig } from "@/core/domain/action/entity";
import { ActionStateSerializer } from "@/core/domain/action/services/actionStateSerializer";
import { pushAction } from "../pushAction";

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

describe("pushAction", () => {
  const getContainer = setupTestActionContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.actionConfigurator.setActions(baseConfig.actions, "1");

    await expect(pushAction({ container, input: {} })).rejects.toSatisfy(
      isValidationError,
    );
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml("local"));
    container.actionConfigurator.setActions(baseConfig.actions, "1");

    const result = await pushAction({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(container.actionConfigurator.lastUpdateParams?.revision).toBe("1");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml("local"));
    container.actionConfigurator.setActions(
      { 見積作成: action("見積作成", { filterCond: "remote" }) },
      "2",
    );

    await expect(pushAction({ container, input: {} })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.actionConfigurator.callLog).not.toContain("updateActions");
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.actionStorage.setContent(actionYaml("local"));
    container.actionConfigurator.setActions(
      { 見積作成: action("見積作成", { filterCond: "remote" }) },
      "2",
    );

    const result = await pushAction({ container, input: { force: true } });

    expect(result.mode).toBe("push");
    expect(
      container.actionConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.actionStorage.setContent(actionYaml(""));
    container.actionConfigurator.setActions(baseConfig.actions, "5");

    const result = await pushAction({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.actionConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.actionStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
