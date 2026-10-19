import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import {
  readProcessStateConfig,
  SAME_NAMED_ACTIONS_CONFIG,
  SAME_NAMED_ACTIONS_CONFIG_SECOND_REPEAT_CHANGED,
  serializeProcessConfig,
  setupTestProcessManagementContainer,
} from "@/core/application/__tests__/helpers";
import type { TestProcessManagementContainer } from "@/core/application/__tests__/helpers/processManagement";
import {
  ConflictError,
  ConflictErrorCode,
  isSystemError,
  isValidationError,
} from "@/core/application/error";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementStateSerializer } from "@/core/domain/processManagement/services/processManagementStateSerializer";
import { pushProcessManagement } from "../pushProcessManagement";

const baseConfig: ProcessManagementConfig = {
  enable: false,
  states: {},
  actions: [],
};

const localYaml = "enable: true\nstates: {}\nactions: []\n";

function setState(
  container: TestProcessManagementContainer,
  config: ProcessManagementConfig,
  revision: string,
): void {
  container.processManagementStateStorage.setContent(
    configCodec.stringify(
      ProcessManagementStateSerializer.serialize({ config }),
    ),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

describe("pushProcessManagement", () => {
  const getContainer = setupTestProcessManagementContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.processManagementConfigurator.setConfig(baseConfig, "1");

    await expect(
      pushProcessManagement({ container, input: {} }),
    ).rejects.toSatisfy(isValidationError);
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.processManagementStorage.setContent(localYaml);
    container.processManagementConfigurator.setConfig(baseConfig, "1");

    const result = await pushProcessManagement({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(
      container.processManagementConfigurator.lastUpdateParams?.revision,
    ).toBe("1");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.processManagementStorage.setContent(localYaml);
    container.processManagementConfigurator.setConfig(
      {
        enable: false,
        states: {},
        actions: [
          { name: "go", from: "a", to: "b", filterCond: "", type: "PRIMARY" },
        ],
      },
      "2",
    );

    await expect(
      pushProcessManagement({ container, input: {} }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.processManagementConfigurator.callLog).not.toContain(
      "updateProcessManagement",
    );
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.processManagementStorage.setContent(localYaml);
    container.processManagementConfigurator.setConfig(
      {
        enable: false,
        states: {},
        actions: [
          { name: "go", from: "a", to: "b", filterCond: "", type: "PRIMARY" },
        ],
      },
      "2",
    );

    const result = await pushProcessManagement({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("push");
    expect(
      container.processManagementConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.processManagementStorage.setContent(localYaml);
    container.processManagementConfigurator.setConfig(baseConfig, "5");

    const result = await pushProcessManagement({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.processManagementConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.processManagementStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  describe("same-named actions", () => {
    it("rejects with ConfigDrift when the remote changed one repeat", async () => {
      const container = getContainer();
      setState(container, SAME_NAMED_ACTIONS_CONFIG, "1");
      container.processManagementStorage.setContent(
        serializeProcessConfig(SAME_NAMED_ACTIONS_CONFIG),
      );
      container.processManagementConfigurator.setConfig(
        SAME_NAMED_ACTIONS_CONFIG_SECOND_REPEAT_CHANGED,
        "2",
      );

      await expect(
        pushProcessManagement({ container, input: {} }),
      ).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof ConflictError &&
          e.code === ConflictErrorCode.ConfigDrift,
      );
      expect(container.processManagementConfigurator.callLog).not.toContain(
        "updateProcessManagement",
      );
    });

    it("sends and saves every action when the local changed one repeat", async () => {
      const container = getContainer();
      setState(container, SAME_NAMED_ACTIONS_CONFIG, "1");
      container.processManagementStorage.setContent(
        serializeProcessConfig(SAME_NAMED_ACTIONS_CONFIG_SECOND_REPEAT_CHANGED),
      );
      container.processManagementConfigurator.setConfig(
        SAME_NAMED_ACTIONS_CONFIG,
        "1",
      );

      const result = await pushProcessManagement({ container, input: {} });

      expect(result.mode).toBe("push");
      expect(
        container.processManagementConfigurator.lastUpdateParams?.config,
      ).toEqual(SAME_NAMED_ACTIONS_CONFIG_SECOND_REPEAT_CHANGED);
      expect(await readProcessStateConfig(container)).toEqual(
        SAME_NAMED_ACTIONS_CONFIG_SECOND_REPEAT_CHANGED,
      );
    });

    it("keeps state and revision when kintone rejects the config", async () => {
      const container = getContainer();
      setState(container, SAME_NAMED_ACTIONS_CONFIG, "1");
      container.processManagementStorage.setContent(
        serializeProcessConfig(SAME_NAMED_ACTIONS_CONFIG_SECOND_REPEAT_CHANGED),
      );
      container.processManagementConfigurator.setConfig(
        SAME_NAMED_ACTIONS_CONFIG,
        "1",
      );
      container.processManagementConfigurator.setFailOn(
        "updateProcessManagement",
      );

      await expect(
        pushProcessManagement({ container, input: {} }),
      ).rejects.toSatisfy(isSystemError);

      expect(await readProcessStateConfig(container)).toEqual(
        SAME_NAMED_ACTIONS_CONFIG,
      );
      expect(container.processManagementStateStorage.callLog).not.toContain(
        "update",
      );
      expect(container.appRevisionStorage.callLog).not.toContain("update");
    });
  });
});
