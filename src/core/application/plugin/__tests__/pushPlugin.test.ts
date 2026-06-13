import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestPluginContainer } from "@/core/application/__tests__/helpers";
import type { TestPluginContainer } from "@/core/application/__tests__/helpers/plugin";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type { PluginConfig, PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginConfigSerializer } from "@/core/domain/plugin/services/configSerializer";
import { PluginStateSerializer } from "@/core/domain/plugin/services/pluginStateSerializer";
import { pushPlugin } from "../pushPlugin";

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

describe("pushPlugin", () => {
  const getContainer = setupTestPluginContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.pluginConfigurator.setPlugins([plugin("a")], "1");

    await expect(pushPlugin({ container, input: {} })).rejects.toSatisfy(
      isValidationError,
    );
  });

  it("adds only plugin ids missing on the remote and sends the observed revision", async () => {
    const container = getContainer();
    const base = { plugins: [plugin("a")] };
    setState(container, base, "1");
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a"), plugin("b")] }),
    );
    container.pluginConfigurator.setPlugins([plugin("a")], "1");

    const result = await pushPlugin({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(result.addedPluginIds).toEqual(["b"]);
    expect(container.pluginConfigurator.lastAddPluginsParams?.ids).toEqual([
      "b",
    ]);
    expect(container.pluginConfigurator.lastAddPluginsParams?.revision).toBe(
      "1",
    );
    expect(result.skipped).toHaveLength(0);
  });

  it("does NOT apply deletions and warns (add-only API, AC-16)", async () => {
    const container = getContainer();
    // base + remote have plugin "a" and "b"; local removed "b".
    const base = { plugins: [plugin("a"), plugin("b")] };
    setState(container, base, "1");
    container.pluginStorage.setContent(yamlOf({ plugins: [plugin("a")] }));
    container.pluginConfigurator.setPlugins([plugin("a"), plugin("b")], "1");

    const result = await pushPlugin({ container, input: {} });

    expect(result.addedPluginIds).toHaveLength(0);
    // No addPlugins call when there is nothing to add.
    expect(container.pluginConfigurator.callLog).not.toContain("addPlugins");
    expect(result.skipped).toContainEqual({ pluginId: "b", reason: "delete" });
  });

  it("does NOT apply enabled/name changes to existing plugins and warns (add-only)", async () => {
    const container = getContainer();
    const base = { plugins: [plugin("a", { enabled: true })] };
    setState(container, base, "1");
    // local disables "a" (an inexpressible modify); remote unchanged.
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a", { enabled: false })] }),
    );
    container.pluginConfigurator.setPlugins(
      [plugin("a", { enabled: true })],
      "1",
    );

    const result = await pushPlugin({ container, input: {} });

    expect(container.pluginConfigurator.callLog).not.toContain("addPlugins");
    expect(result.skipped).toContainEqual({ pluginId: "a", reason: "modify" });
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    const base = { plugins: [plugin("a")] };
    setState(container, base, "1");
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a"), plugin("b")] }),
    );
    // remote added "c" relative to base → remoteOnly drift.
    container.pluginConfigurator.setPlugins([plugin("a"), plugin("c")], "2");

    await expect(pushPlugin({ container, input: {} })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.pluginConfigurator.callLog).not.toContain("addPlugins");
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    const base = { plugins: [plugin("a")] };
    setState(container, base, "1");
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a"), plugin("b")] }),
    );
    container.pluginConfigurator.setPlugins([plugin("a"), plugin("c")], "2");

    const result = await pushPlugin({ container, input: { force: true } });

    expect(result.mode).toBe("push");
    expect(result.addedPluginIds).toEqual(["b"]);
    expect(
      container.pluginConfigurator.lastAddPluginsParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) adds missing ids and initializes state", async () => {
    const container = getContainer();
    container.pluginStorage.setContent(
      yamlOf({ plugins: [plugin("a"), plugin("b")] }),
    );
    container.pluginConfigurator.setPlugins([plugin("a")], "5");

    const result = await pushPlugin({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(result.addedPluginIds).toEqual(["b"]);
    expect(
      container.pluginConfigurator.lastAddPluginsParams?.revision,
    ).toBeUndefined();
    expect(container.pluginStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
