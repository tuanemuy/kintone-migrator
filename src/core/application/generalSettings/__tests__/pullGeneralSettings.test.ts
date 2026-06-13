import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestGeneralSettingsContainer } from "@/core/application/__tests__/helpers";
import type { TestGeneralSettingsContainer } from "@/core/application/__tests__/helpers/generalSettings";
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsStateSerializer } from "@/core/domain/generalSettings/services/generalSettingsStateSerializer";
import {
  applyPulledGeneralSettingsMerge,
  pullGeneralSettings,
} from "../pullGeneralSettings";

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

describe("pullGeneralSettings", () => {
  const getContainer = setupTestGeneralSettingsContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.generalSettingsConfigurator.setConfig({ name: "remote" }, "7");

    const result = await pullGeneralSettings({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.generalSettingsStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig({ name: "remote" }, "2");

    const result = await pullGeneralSettings({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("force");
  });

  it("auto-merges a local-only change without conflict (no write of state until apply)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig(baseConfig, "1");

    const result = await pullGeneralSettings({ container, input: {} });

    expect(result.mode).toBe("merged");
    if (result.mode === "merged") {
      expect(result.merge.hasConflict).toBe(false);
      expect(result.merge.change.kind).toBe("localOnly");
    }
    expect(container.generalSettingsStorage.callLog).not.toContain("update");
    expect(container.generalSettingsStateStorage.callLog).not.toContain(
      "update",
    );
  });

  it("returns a conflict merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig({ name: "remote" }, "2");

    const result = await pullGeneralSettings({ container, input: {} });

    expect(result.mode).toBe("merged");
    if (result.mode === "merged") {
      expect(result.merge.hasConflict).toBe(true);
    }
    expect(container.generalSettingsStorage.callLog).not.toContain("update");
  });

  it("applyPulledGeneralSettingsMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig({ name: "remote" }, "2");

    const pull = await pullGeneralSettings({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledGeneralSettingsMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: "remote",
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.generalSettingsStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
