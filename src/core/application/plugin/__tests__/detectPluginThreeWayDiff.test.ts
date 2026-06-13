import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestPluginContainer } from "@/core/application/__tests__/helpers";
import type { TestPluginContainer } from "@/core/application/__tests__/helpers/plugin";
import type { PluginConfig, PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginConfigSerializer } from "@/core/domain/plugin/services/configSerializer";
import { PluginStateSerializer } from "@/core/domain/plugin/services/pluginStateSerializer";
import { detectPluginThreeWayDiff } from "../detectPluginThreeWayDiff";

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

const base: PluginsConfig = { plugins: [plugin("a")] };

describe("detectPluginThreeWayDiff", () => {
  const getContainer = setupTestPluginContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.pluginStorage.setContent(yamlOf(base));
    container.pluginConfigurator.setPlugins(base.plugins, "1");

    const result = await detectPluginThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only add", async () => {
    const container = getContainer();
    setState(container, base, "1");
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a"), plugin("b")] }),
    );
    container.pluginConfigurator.setPlugins(base.plugins, "1");

    const result = await detectPluginThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toContain("b");
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, base, "1");
    container.pluginStorage.setContent(yamlOf(base));
    container.pluginConfigurator.setPlugins([plugin("a"), plugin("c")], "2");

    const result = await detectPluginThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toContain("c");
    }
  });

  it("classifies a conflict on enabled/name divergence", async () => {
    const container = getContainer();
    setState(container, base, "1");
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a", { enabled: false })] }),
    );
    container.pluginConfigurator.setPlugins(
      [plugin("a", { name: "renamed" })],
      "2",
    );

    const result = await detectPluginThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toContain("a");
    }
  });
});
