import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestProcessManagementContainer } from "@/core/application/__tests__/helpers";
import type { TestProcessManagementContainer } from "@/core/application/__tests__/helpers/processManagement";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementStateSerializer } from "@/core/domain/processManagement/services/processManagementStateSerializer";
import { detectProcessManagementThreeWayDiff } from "../detectProcessManagementThreeWayDiff";

const baseConfig: ProcessManagementConfig = {
  enable: false,
  states: {},
  actions: [],
};

const localEnabledYaml = "enable: true\nstates: {}\nactions: []\n";
const localBaseYaml = "enable: false\nstates: {}\nactions: []\n";

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

describe("detectProcessManagementThreeWayDiff", () => {
  const getContainer = setupTestProcessManagementContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.processManagementStorage.setContent(localEnabledYaml);
    container.processManagementConfigurator.setConfig(baseConfig, "1");

    const result = await detectProcessManagementThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.processManagementStorage.setContent(localEnabledYaml);
    container.processManagementConfigurator.setConfig(baseConfig, "1");

    const result = await detectProcessManagementThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toEqual(["process"]);
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.processManagementStorage.setContent(localBaseYaml);
    container.processManagementConfigurator.setConfig(
      { enable: true, states: {}, actions: [] },
      "2",
    );

    const result = await detectProcessManagementThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toEqual(["process"]);
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.processManagementStorage.setContent(localEnabledYaml);
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

    const result = await detectProcessManagementThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toEqual(["process"]);
    }
  });
});
