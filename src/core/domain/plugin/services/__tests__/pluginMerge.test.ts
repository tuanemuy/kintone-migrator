import { describe, expect, it } from "vitest";
import type { PluginConfig, PluginsConfig } from "../../entity";
import {
  computePluginThreeWayMerge,
  isPluginConfigEqual,
  resolvePluginMerge,
} from "../pluginMerge";

function plugin(
  id: string,
  overrides: Partial<PluginConfig> = {},
): PluginConfig {
  return { id, name: id, enabled: true, ...overrides };
}

function cfg(...plugins: PluginConfig[]): PluginsConfig {
  return { plugins };
}

describe("isPluginConfigEqual", () => {
  it("compares name and enabled (not id, which is the key)", () => {
    expect(
      isPluginConfigEqual(
        plugin("a", { name: "X" }),
        plugin("a", { name: "X" }),
      ),
    ).toBe(true);
    expect(
      isPluginConfigEqual(
        plugin("a", { name: "X" }),
        plugin("a", { name: "Y" }),
      ),
    ).toBe(false);
    expect(
      isPluginConfigEqual(
        plugin("a", { enabled: true }),
        plugin("a", { enabled: false }),
      ),
    ).toBe(false);
  });
});

describe("computePluginThreeWayMerge", () => {
  it("classifies a locally added plugin as localOnly", () => {
    const base = cfg(plugin("a"));
    const local = cfg(plugin("a"), plugin("b"));
    const remote = cfg(plugin("a"));
    const merge = computePluginThreeWayMerge(base, local, remote);
    const b = merge.entries.find((e) => e.key === "b");
    expect(b?.change.kind).toBe("localOnly");
    expect(merge.hasConflict).toBe(false);
  });

  it("classifies a remotely added plugin as remoteOnly", () => {
    const base = cfg(plugin("a"));
    const local = cfg(plugin("a"));
    const remote = cfg(plugin("a"), plugin("c"));
    const merge = computePluginThreeWayMerge(base, local, remote);
    expect(merge.entries.find((e) => e.key === "c")?.change.kind).toBe(
      "remoteOnly",
    );
  });

  it("flags a same-id enabled divergence on both sides as conflict", () => {
    const base = cfg(plugin("a", { enabled: true }));
    const local = cfg(plugin("a", { enabled: false }));
    const remote = cfg(plugin("a", { name: "renamed" }));
    const merge = computePluginThreeWayMerge(base, local, remote);
    expect(merge.entries.find((e) => e.key === "a")?.change.kind).toBe(
      "conflict",
    );
    expect(merge.hasConflict).toBe(true);
  });
});

describe("resolvePluginMerge", () => {
  it("flattens auto-merged entries back into a plugins list", () => {
    const base = cfg(plugin("a"));
    const local = cfg(plugin("a"), plugin("b"));
    const remote = cfg(plugin("a"));
    const merge = computePluginThreeWayMerge(base, local, remote);
    const result = resolvePluginMerge(merge, new Map());
    expect(result.plugins.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("applies the chosen side for a conflict", () => {
    const base = cfg(plugin("a", { enabled: true }));
    const local = cfg(plugin("a", { enabled: false }));
    const remote = cfg(plugin("a", { name: "renamed" }));
    const merge = computePluginThreeWayMerge(base, local, remote);
    const result = resolvePluginMerge(merge, new Map([["a", "local"]]));
    expect(result.plugins[0].enabled).toBe(false);
  });

  it("throws when a conflict is left unresolved", () => {
    const base = cfg(plugin("a", { enabled: true }));
    const local = cfg(plugin("a", { enabled: false }));
    const remote = cfg(plugin("a", { name: "renamed" }));
    const merge = computePluginThreeWayMerge(base, local, remote);
    expect(() => resolvePluginMerge(merge, new Map())).toThrow();
  });
});
