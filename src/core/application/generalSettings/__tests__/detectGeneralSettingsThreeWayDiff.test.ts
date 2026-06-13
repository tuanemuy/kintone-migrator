import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestGeneralSettingsContainer } from "@/core/application/__tests__/helpers";
import type { TestGeneralSettingsContainer } from "@/core/application/__tests__/helpers/generalSettings";
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsStateSerializer } from "@/core/domain/generalSettings/services/generalSettingsStateSerializer";
import { detectGeneralSettingsThreeWayDiff } from "../detectGeneralSettingsThreeWayDiff";

function setState(
  container: TestGeneralSettingsContainer,
  config: GeneralSettingsConfig,
  revision: string,
): void {
  container.generalSettingsStateStorage.setContent(
    configCodec.stringify(GeneralSettingsStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

const baseConfig: GeneralSettingsConfig = { name: "base" };

describe("detectGeneralSettingsThreeWayDiff", () => {
  const getContainer = setupTestGeneralSettingsContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig(baseConfig, "1");

    const result = await detectGeneralSettingsThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig(baseConfig, "1");

    const result = await detectGeneralSettingsThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toEqual(["settings"]);
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: base\n");
    container.generalSettingsConfigurator.setConfig({ name: "remote" }, "2");

    const result = await detectGeneralSettingsThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toEqual(["settings"]);
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig({ name: "remote" }, "2");

    const result = await detectGeneralSettingsThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toEqual(["settings"]);
    }
  });

  it("reports no changes when local, remote, and base are in sync", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: base\n");
    container.generalSettingsConfigurator.setConfig(baseConfig, "1");

    const result = await detectGeneralSettingsThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.isEmpty).toBe(true);
    }
  });
});
