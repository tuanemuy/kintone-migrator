import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestProcessManagementContainer } from "@/core/application/__tests__/helpers";
import type { TestProcessManagementContainer } from "@/core/application/__tests__/helpers/processManagement";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementStateSerializer } from "@/core/domain/processManagement/services/processManagementStateSerializer";
import {
  applyPulledProcessManagementMerge,
  pullProcessManagement,
} from "../pullProcessManagement";

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

describe("pullProcessManagement", () => {
  const getContainer = setupTestProcessManagementContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.processManagementConfigurator.setConfig(
      { enable: true, states: {}, actions: [] },
      "7",
    );

    const result = await pullProcessManagement({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.processManagementStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.processManagementStorage.setContent(localYaml);
    container.processManagementConfigurator.setConfig(
      { enable: true, states: {}, actions: [] },
      "2",
    );

    const result = await pullProcessManagement({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("force");
  });

  it("returns a conflict merge for resolution without writing local/state", async () => {
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

    const result = await pullProcessManagement({ container, input: {} });

    expect(result.mode).toBe("merged");
    if (result.mode === "merged") {
      expect(result.merge.hasConflict).toBe(true);
    }
    expect(container.processManagementStorage.callLog).not.toContain("update");
    expect(container.processManagementStateStorage.callLog).not.toContain(
      "update",
    );
  });

  it("applyPulledProcessManagementMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.processManagementStorage.setContent(localYaml);
    const remoteConfig: ProcessManagementConfig = {
      enable: false,
      states: {},
      actions: [
        { name: "go", from: "a", to: "b", filterCond: "", type: "PRIMARY" },
      ],
    };
    container.processManagementConfigurator.setConfig(remoteConfig, "2");

    const pull = await pullProcessManagement({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledProcessManagementMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: "remote",
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.processManagementStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
