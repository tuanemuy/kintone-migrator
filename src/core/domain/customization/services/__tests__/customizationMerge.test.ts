import { describe, expect, it } from "vitest";
import type { CustomizationConfig } from "../../entity";
import type {
  ContentDigest,
  CustomizationFileDigests,
  CustomizationFileTags,
  CustomizationResource,
} from "../../valueObject";
import {
  type CustomizationMergeTags,
  computeCustomizationThreeWayMerge,
  fileResourceKeys,
  resolveBaseFileDigests,
  resolveCustomizationMerge,
} from "../customizationMerge";

function file(name: string): CustomizationResource {
  return { type: "FILE", path: name };
}

function fileAt(path: string): CustomizationResource {
  return { type: "FILE", path };
}

function url(u: string): CustomizationResource {
  return { type: "URL", url: u };
}

function pathOf(r: CustomizationResource): string {
  return r.type === "FILE" ? r.path : r.url;
}

function cfg(
  desktopJs: CustomizationResource[],
  scope: CustomizationConfig["scope"] = "ALL",
): CustomizationConfig {
  return {
    scope,
    desktop: { js: desktopJs, css: [] },
    mobile: { js: [], css: [] },
  };
}

/** A digest-shaped token; the merge only ever compares these for equality. */
function digest(label: string): ContentDigest {
  return `sha256:${label}`;
}

function digests(entries: Record<string, string>): CustomizationFileDigests {
  return new Map(
    Object.entries(entries).map(([key, label]) => [key, digest(label)]),
  );
}

function tagsOf(entries: Record<string, string>): CustomizationFileTags {
  return digests(entries);
}

/** Per-side content tags; a side omitted here has no digest for any key. */
function tags(sides: {
  base?: Record<string, string>;
  local?: Record<string, string>;
  remote?: Record<string, string>;
}): CustomizationMergeTags {
  return {
    base: tagsOf(sides.base ?? {}),
    local: tagsOf(sides.local ?? {}),
    remote: tagsOf(sides.remote ?? {}),
  };
}

/** Every side carries the same content for each key (no content change at all). */
function allSame(...keys: string[]): CustomizationMergeTags {
  const entries = Object.fromEntries(keys.map((key) => [key, `body-${key}`]));
  return tags({ base: entries, local: entries, remote: entries });
}

const KEY = "desktop:js:a.js";

function kindOf(
  merge: ReturnType<typeof computeCustomizationThreeWayMerge>,
  key: string,
): string | undefined {
  return merge.entries.find((e) => e.key === key)?.change.kind;
}

describe("computeCustomizationThreeWayMerge — FILE content", () => {
  it("classifies a file changed only locally as localOnly (base == remote)", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      tags({
        base: { [KEY]: "v1" },
        local: { [KEY]: "v2" },
        remote: { [KEY]: "v1" },
      }),
    );

    expect(kindOf(merge, KEY)).toBe("localOnly");
    expect(merge.hasConflict).toBe(false);
  });

  it("classifies a file changed only remotely as remoteOnly (base == local)", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      tags({
        base: { [KEY]: "v1" },
        local: { [KEY]: "v1" },
        remote: { [KEY]: "v2" },
      }),
    );

    expect(kindOf(merge, KEY)).toBe("remoteOnly");
    expect(merge.hasConflict).toBe(false);
  });

  it("flags a file changed to different contents on both sides as conflict", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      tags({
        base: { [KEY]: "v1" },
        local: { [KEY]: "v2" },
        remote: { [KEY]: "v3" },
      }),
    );

    expect(kindOf(merge, KEY)).toBe("conflict");
    expect(merge.hasConflict).toBe(true);
  });

  it("classifies identical changes on both sides as bothSame", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      tags({
        base: { [KEY]: "v1" },
        local: { [KEY]: "v2" },
        remote: { [KEY]: "v2" },
      }),
    );

    expect(kindOf(merge, KEY)).toBe("bothSame");
    expect(merge.hasConflict).toBe(false);
  });

  it("classifies an untouched file as unchanged", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      allSame(KEY),
    );

    expect(kindOf(merge, KEY)).toBe("unchanged");
  });

  it("keys content by bucket so a same-basename file in another bucket is unaffected", () => {
    const withBoth = (): CustomizationConfig => ({
      scope: "ALL",
      desktop: { js: [file("main.js")], css: [] },
      mobile: { js: [file("main.js")], css: [] },
    });
    const desktopKey = "desktop:js:main.js";
    const mobileKey = "mobile:js:main.js";

    const merge = computeCustomizationThreeWayMerge(
      withBoth(),
      withBoth(),
      withBoth(),
      tags({
        base: { [desktopKey]: "v1", [mobileKey]: "m1" },
        local: { [desktopKey]: "v2", [mobileKey]: "m1" },
        remote: { [desktopKey]: "v3", [mobileKey]: "m1" },
      }),
    );

    expect(kindOf(merge, desktopKey)).toBe("conflict");
    expect(kindOf(merge, mobileKey)).toBe("unchanged");
  });
});

describe("computeCustomizationThreeWayMerge — structure (unchanged behaviour)", () => {
  it("classifies a locally added file as localOnly", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([file("a.js"), file("b.js")]),
      cfg([file("a.js")]),
      allSame(KEY),
    );

    expect(kindOf(merge, "desktop:js:b.js")).toBe("localOnly");
    expect(merge.hasConflict).toBe(false);
  });

  it("classifies a remotely added file as remoteOnly", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      cfg([file("a.js"), file("c.js")]),
      allSame(KEY),
    );

    expect(kindOf(merge, "desktop:js:c.js")).toBe("remoteOnly");
  });

  it("classifies a locally deleted file as localOnly", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([]),
      cfg([file("a.js")]),
      tags({ base: { [KEY]: "v1" }, remote: { [KEY]: "v1" } }),
    );

    expect(kindOf(merge, KEY)).toBe("localOnly");
  });

  it("classifies a remotely deleted file as remoteOnly", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("a.js")]),
      cfg([file("a.js")]),
      cfg([]),
      tags({ base: { [KEY]: "v1" }, local: { [KEY]: "v1" } }),
    );

    expect(kindOf(merge, KEY)).toBe("remoteOnly");
  });

  it("treats a rename as old-name removal + new-name addition", () => {
    const oldKey = "desktop:js:old.js";
    const merge = computeCustomizationThreeWayMerge(
      cfg([file("old.js")]),
      cfg([file("new.js")]),
      cfg([file("old.js")]),
      tags({ base: { [oldKey]: "v1" }, remote: { [oldKey]: "v1" } }),
    );

    expect(kindOf(merge, oldKey)).toBe("localOnly");
    expect(kindOf(merge, "desktop:js:new.js")).toBe("localOnly");
  });

  it("classifies URL additions, deletions and replacements without digests", () => {
    const added = computeCustomizationThreeWayMerge(
      cfg([]),
      cfg([url("https://cdn.example.com/lib.js")]),
      cfg([]),
      tags({}),
    );
    expect(kindOf(added, "desktop:js:https://cdn.example.com/lib.js")).toBe(
      "localOnly",
    );

    const removed = computeCustomizationThreeWayMerge(
      cfg([url("https://cdn.example.com/lib.js")]),
      cfg([url("https://cdn.example.com/lib.js")]),
      cfg([]),
      tags({}),
    );
    expect(kindOf(removed, "desktop:js:https://cdn.example.com/lib.js")).toBe(
      "remoteOnly",
    );

    const replaced = computeCustomizationThreeWayMerge(
      cfg([url("https://cdn.example.com/a.js")]),
      cfg([url("https://cdn.example.com/b.js")]),
      cfg([url("https://cdn.example.com/a.js")]),
      tags({}),
    );
    expect(kindOf(replaced, "desktop:js:https://cdn.example.com/a.js")).toBe(
      "localOnly",
    );
    expect(kindOf(replaced, "desktop:js:https://cdn.example.com/b.js")).toBe(
      "localOnly",
    );
  });

  it("flags a scope change on both sides to different values as conflict", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([], "ALL"),
      cfg([], "ADMIN"),
      cfg([], "NONE"),
      tags({}),
    );

    expect(kindOf(merge, "config:scope")).toBe("conflict");
  });

  it("classifies a local-only scope change as localOnly", () => {
    const merge = computeCustomizationThreeWayMerge(
      cfg([], "ALL"),
      cfg([], "ADMIN"),
      cfg([], "ALL"),
      tags({}),
    );

    expect(kindOf(merge, "config:scope")).toBe("localOnly");
  });
});

describe("fileResourceKeys", () => {
  it("collects the bucket-qualified key of every FILE resource, skipping URLs", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: {
        js: [file("a.js"), url("https://cdn.example.com/lib.js")],
        css: [fileAt("build/desktop/style.css")],
      },
      mobile: { js: [], css: [file("m.css")] },
    };

    expect([...fileResourceKeys(config)].sort()).toEqual([
      "desktop:css:style.css",
      "desktop:js:a.js",
      "mobile:css:m.css",
    ]);
  });
});

describe("resolveBaseFileDigests", () => {
  const base = cfg([file("a.js")]);
  const bothSides = {
    localKeys: new Set([KEY]),
    remoteKeys: new Set([KEY]),
  };

  it("uses the recorded digest when the snapshot has one (rule 1)", () => {
    const { tags: resolved, estimatedKeys } = resolveBaseFileDigests(
      base,
      digests({ [KEY]: "recorded" }),
      digests({ [KEY]: "local" }),
      digests({ [KEY]: "remote" }),
      { ...bothSides, legacyState: false, remoteUnchanged: true },
    );

    expect(resolved.get(KEY)).toBe(digest("recorded"));
    expect(estimatedKeys.optimistic.size).toBe(0);
    expect(estimatedKeys.conservative.size).toBe(0);
  });

  it("adopts the remote digest for a legacy state at an unchanged revision (rule 2)", () => {
    const { tags: resolved, estimatedKeys } = resolveBaseFileDigests(
      base,
      new Map(),
      digests({ [KEY]: "local" }),
      digests({ [KEY]: "remote" }),
      { ...bothSides, legacyState: true, remoteUnchanged: true },
    );

    expect(resolved.get(KEY)).toBe(digest("remote"));
    expect([...estimatedKeys.optimistic]).toEqual([KEY]);
    expect(estimatedKeys.conservative.size).toBe(0);
  });

  it("does not take the optimistic branch when the state already records another digest", () => {
    const twoFiles = cfg([file("a.js"), file("b.js")]);
    const otherKey = "desktop:js:b.js";

    const { tags: resolved, estimatedKeys } = resolveBaseFileDigests(
      twoFiles,
      digests({ [otherKey]: "recorded" }),
      digests({ [KEY]: "local" }),
      digests({ [KEY]: "remote" }),
      {
        localKeys: new Set([KEY, otherKey]),
        remoteKeys: new Set([KEY, otherKey]),
        legacyState: false,
        remoteUnchanged: true,
      },
    );

    // a.js falls through to the conservative rules: both sides differ → conflict.
    expect(resolved.get(KEY)).toBe("untracked:base");
    expect(estimatedKeys.optimistic.size).toBe(0);
    expect([...estimatedKeys.conservative]).toEqual([KEY]);
  });

  it("does not take the optimistic branch when the app revision advanced", () => {
    const { tags: resolved, estimatedKeys } = resolveBaseFileDigests(
      base,
      new Map(),
      digests({ [KEY]: "same" }),
      digests({ [KEY]: "same" }),
      { ...bothSides, legacyState: true, remoteUnchanged: false },
    );

    // Rule 4: both sides agree, so the base agrees too.
    expect(resolved.get(KEY)).toBe(digest("same"));
    expect(estimatedKeys.optimistic.size).toBe(0);
    expect([...estimatedKeys.conservative]).toEqual([KEY]);
  });

  it("takes the existing side's tag when the key is on one side only (rule 3)", () => {
    const localOnly = resolveBaseFileDigests(
      base,
      new Map(),
      digests({ [KEY]: "local" }),
      new Map(),
      {
        localKeys: new Set([KEY]),
        remoteKeys: new Set(),
        legacyState: true,
        remoteUnchanged: false,
      },
    );
    expect(localOnly.tags.get(KEY)).toBe(digest("local"));

    const remoteOnly = resolveBaseFileDigests(
      base,
      new Map(),
      new Map(),
      digests({ [KEY]: "remote" }),
      {
        localKeys: new Set(),
        remoteKeys: new Set([KEY]),
        legacyState: true,
        remoteUnchanged: false,
      },
    );
    expect(remoteOnly.tags.get(KEY)).toBe(digest("remote"));
  });

  it("falls back to the existing side's untracked sentinel when its digest is missing", () => {
    const localOnly = resolveBaseFileDigests(
      base,
      new Map(),
      new Map(),
      new Map(),
      {
        localKeys: new Set([KEY]),
        remoteKeys: new Set(),
        legacyState: true,
        remoteUnchanged: false,
      },
    );
    expect(localOnly.tags.get(KEY)).toBe("untracked:local");

    const remoteOnly = resolveBaseFileDigests(
      base,
      new Map(),
      new Map(),
      new Map(),
      {
        localKeys: new Set(),
        remoteKeys: new Set([KEY]),
        legacyState: true,
        remoteUnchanged: false,
      },
    );
    expect(remoteOnly.tags.get(KEY)).toBe("untracked:remote");
  });

  it("reports only keys that exist on at least one side as estimated", () => {
    const { estimatedKeys } = resolveBaseFileDigests(
      base,
      new Map(),
      new Map(),
      new Map(),
      {
        localKeys: new Set(),
        remoteKeys: new Set(),
        legacyState: true,
        remoteUnchanged: false,
      },
    );

    expect(estimatedKeys.optimistic.size).toBe(0);
    expect(estimatedKeys.conservative.size).toBe(0);
  });
});

/**
 * A snapshot with no digests must classify exactly as the pre-digest
 * implementation did whenever the app revision has moved on.
 */
describe("digest-less snapshot at a changed revision keeps the previous classification", () => {
  function classify(
    localFiles: CustomizationResource[],
    remoteFiles: CustomizationResource[],
    contents: { local?: string; remote?: string },
  ): string | undefined {
    const baseConfig = cfg([file("a.js")]);
    const localConfig = cfg(localFiles);
    const remoteConfig = cfg(remoteFiles);
    const localDigests =
      contents.local === undefined
        ? new Map()
        : digests({ [KEY]: contents.local });
    const remoteDigests =
      contents.remote === undefined
        ? new Map()
        : digests({ [KEY]: contents.remote });

    const { tags: baseTags } = resolveBaseFileDigests(
      baseConfig,
      new Map(),
      localDigests,
      remoteDigests,
      {
        localKeys: fileResourceKeys(localConfig),
        remoteKeys: fileResourceKeys(remoteConfig),
        legacyState: true,
        remoteUnchanged: false,
      },
    );

    return kindOf(
      computeCustomizationThreeWayMerge(baseConfig, localConfig, remoteConfig, {
        base: baseTags,
        local: localDigests,
        remote: remoteDigests,
      }),
      KEY,
    );
  }

  it("(a) present everywhere with matching content → unchanged", () => {
    expect(
      classify([file("a.js")], [file("a.js")], {
        local: "same",
        remote: "same",
      }),
    ).toBe("unchanged");
  });

  it("(b) present everywhere with diverging content → conflict", () => {
    expect(
      classify([file("a.js")], [file("a.js")], {
        local: "mine",
        remote: "theirs",
      }),
    ).toBe("conflict");
  });

  it("(c) deleted on the remote → remoteOnly", () => {
    expect(classify([file("a.js")], [], { local: "mine" })).toBe("remoteOnly");
  });

  it("(d) declaration removed locally → localOnly", () => {
    expect(classify([], [file("a.js")], { remote: "theirs" })).toBe(
      "localOnly",
    );
  });

  it("(e) deleted on both sides → bothSame", () => {
    expect(classify([], [], {})).toBe("bothSame");
  });
});

describe("resolveCustomizationMerge", () => {
  it("expresses a rename via full-list replace (old removed, new added)", () => {
    const base = cfg([file("old.js")]);
    const local = cfg([file("new.js")]);
    const remote = cfg([file("old.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      allSame("desktop:js:old.js"),
    );

    const result = resolveCustomizationMerge(merge, new Map(), local, remote);
    expect(result.desktop.js.map(pathOf)).toEqual(["new.js"]);
  });

  it("takes the chosen side for a same-name content conflict", () => {
    const base = cfg([file("a.js")]);
    const local = cfg([file("a.js")]);
    const remote = cfg([file("a.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      tags({
        base: { [KEY]: "v1" },
        local: { [KEY]: "v2" },
        remote: { [KEY]: "v3" },
      }),
    );

    const result = resolveCustomizationMerge(
      merge,
      new Map([[KEY, "remote"]]),
      local,
      remote,
    );
    expect(result.desktop.js.map(pathOf)).toEqual(["a.js"]);
  });

  it("throws when a conflict is left unresolved", () => {
    const base = cfg([file("a.js")]);
    const local = cfg([file("a.js")]);
    const remote = cfg([file("a.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      tags({
        base: { [KEY]: "v1" },
        local: { [KEY]: "v2" },
        remote: { [KEY]: "v3" },
      }),
    );

    expect(() =>
      resolveCustomizationMerge(merge, new Map(), local, remote),
    ).toThrow();
  });

  it("keeps the local declared path for an unchanged entry (path is local-owned)", () => {
    // base/remote carry the basename path (state/remote view); local declares a
    // nested build-output path with the same basename.
    const base = cfg([file("a.js")]);
    const local = cfg([fileAt("app/desktop/js/a.js")]);
    const remote = cfg([file("a.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      allSame(KEY),
    );

    const result = resolveCustomizationMerge(merge, new Map(), local, remote);
    expect(result.desktop.js.map(pathOf)).toEqual(["app/desktop/js/a.js"]);
  });

  it("keeps the local declared path even when a conflict is resolved to remote", () => {
    const base = cfg([file("a.js")]);
    const local = cfg([fileAt("app/desktop/js/a.js")]);
    const remote = cfg([file("a.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      tags({
        base: { [KEY]: "v1" },
        local: { [KEY]: "v2" },
        remote: { [KEY]: "v3" },
      }),
    );

    const result = resolveCustomizationMerge(
      merge,
      new Map([[KEY, "remote"]]),
      local,
      remote,
    );
    // content-source is remote, but path stays the local declared path.
    expect(result.desktop.js.map(pathOf)).toEqual(["app/desktop/js/a.js"]);
  });

  it("uses the remote basename path only for a remote-only entry", () => {
    const base = cfg([file("a.js")]);
    const local = cfg([fileAt("app/desktop/js/a.js")]);
    const remote = cfg([file("a.js"), file("c.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      allSame(KEY),
    );

    const result = resolveCustomizationMerge(merge, new Map(), local, remote);
    // existing entry keeps its nested path; new remote-only file uses basename.
    expect(result.desktop.js.map(pathOf)).toEqual([
      "app/desktop/js/a.js",
      "c.js",
    ]);
  });
});
