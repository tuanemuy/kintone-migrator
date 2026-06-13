import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestPluginContainer } from "@/core/application/__tests__/helpers";
import type { TestPluginContainer } from "@/core/application/__tests__/helpers/plugin";
import type { PluginConfig, PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginConfigSerializer } from "@/core/domain/plugin/services/configSerializer";
import { PluginStateSerializer } from "@/core/domain/plugin/services/pluginStateSerializer";
import { applyPulledPluginMerge, pullPlugin } from "../pullPlugin";

function plugin(
  id: string,
  overrides: Partial<PluginConfig> = {},
): PluginConfig {
  return { id, name: id, enabled: true, ...overrides };
}

function yamlOf(config: PluginsConfig): string {
  return configCodec.stringify(PluginConfigSerializer.serialize(config));
}

function setState(
  container: TestPluginContainer,
  config: PluginsConfig,
  revision: string,
): void {
  container.pluginStateStorage.setContent(
    configCodec.stringify(PluginStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

describe("pullPlugin", () => {
  const getContainer = setupTestPluginContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.pluginConfigurator.setPlugins([plugin("a")], "7");

    const result = await pullPlugin({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.pluginStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
    expect(container.pluginConfigurator.callLog).not.toContain("addPlugins");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, { plugins: [plugin("a")] }, "1");
    container.pluginStorage.setContent(yamlOf({ plugins: [plugin("a")] }));
    container.pluginConfigurator.setPlugins([plugin("a"), plugin("b")], "2");

    const result = await pullPlugin({ container, input: { force: true } });

    expect(result.mode).toBe("force");
  });

  it("returns the merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, { plugins: [plugin("a")] }, "1");
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a"), plugin("b")] }),
    );
    container.pluginConfigurator.setPlugins([plugin("a")], "1");

    const result = await pullPlugin({ container, input: {} });

    expect(result.mode).toBe("merged");
    expect(container.pluginStorage.callLog).not.toContain("update");
    expect(container.pluginStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledPluginMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, { plugins: [plugin("a", { enabled: true })] }, "1");
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a", { enabled: false })] }),
    );
    container.pluginConfigurator.setPlugins(
      [plugin("a", { name: "renamed" })],
      "2",
    );

    const pull = await pullPlugin({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledPluginMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: new Map([["a", "remote"]]),
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.pluginStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
    // pull never touches the remote (read-only).
    expect(container.pluginConfigurator.callLog).not.toContain("addPlugins");
  });
});
