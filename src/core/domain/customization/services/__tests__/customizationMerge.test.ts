import { describe, expect, it } from "vitest";
import type { CustomizationConfig } from "../../entity";
import type { CustomizationResource } from "../../valueObject";
import {
  computeCustomizationThreeWayMerge,
  resolveCustomizationMerge,
} from "../customizationMerge";

function file(name: string): CustomizationResource {
  return { type: "FILE", path: name };
}

function fileAt(path: string): CustomizationResource {
  return { type: "FILE", path };
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

const NO_MODIFIED = new Set<string>();

describe("computeCustomizationThreeWayMerge", () => {
  it("classifies a locally added file as localOnly", () => {
    const base = cfg([file("a.js")]);
    const local = cfg([file("a.js"), file("b.js")]);
    const remote = cfg([file("a.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      NO_MODIFIED,
    );
    expect(
      merge.entries.find((e) => e.key === "desktop:js:b.js")?.change.kind,
    ).toBe("localOnly");
    expect(merge.hasConflict).toBe(false);
  });

  it("classifies a remotely added file as remoteOnly", () => {
    const base = cfg([file("a.js")]);
    const local = cfg([file("a.js")]);
    const remote = cfg([file("a.js"), file("c.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      NO_MODIFIED,
    );
    expect(
      merge.entries.find((e) => e.key === "desktop:js:c.js")?.change.kind,
    ).toBe("remoteOnly");
  });

  it("flags a same-name file with diverged content on both sides as conflict", () => {
    const base = cfg([file("a.js")]);
    const local = cfg([file("a.js")]);
    const remote = cfg([file("a.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      new Set(["a.js"]),
    );
    expect(
      merge.entries.find((e) => e.key === "desktop:js:a.js")?.change.kind,
    ).toBe("conflict");
    expect(merge.hasConflict).toBe(true);
  });

  it("does NOT conflict when content is unchanged (same tag)", () => {
    const base = cfg([file("a.js")]);
    const local = cfg([file("a.js")]);
    const remote = cfg([file("a.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      NO_MODIFIED,
    );
    expect(
      merge.entries.find((e) => e.key === "desktop:js:a.js")?.change.kind,
    ).toBe("unchanged");
  });

  it("treats a rename as old-name removal + new-name addition", () => {
    const base = cfg([file("old.js")]);
    const local = cfg([file("new.js")]); // renamed locally
    const remote = cfg([file("old.js")]);
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      NO_MODIFIED,
    );
    expect(
      merge.entries.find((e) => e.key === "desktop:js:old.js")?.change.kind,
    ).toBe("localOnly"); // local removed old → only local diverged
    expect(
      merge.entries.find((e) => e.key === "desktop:js:new.js")?.change.kind,
    ).toBe("localOnly");
  });

  it("flags a scope change on both sides to different values as conflict", () => {
    const base = cfg([], "ALL");
    const local = cfg([], "ADMIN");
    const remote = cfg([], "NONE");
    const merge = computeCustomizationThreeWayMerge(
      base,
      local,
      remote,
      NO_MODIFIED,
    );
    expect(
      merge.entries.find((e) => e.key === "config:scope")?.change.kind,
    ).toBe("conflict");
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
      NO_MODIFIED,
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
      new Set(["a.js"]),
    );
    const result = resolveCustomizationMerge(
      merge,
      new Map([["desktop:js:a.js", "remote"]]),
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
      new Set(["a.js"]),
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
      NO_MODIFIED,
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
      new Set(["a.js"]),
    );
    const result = resolveCustomizationMerge(
      merge,
      new Map([["desktop:js:a.js", "remote"]]),
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
      NO_MODIFIED,
    );
    const result = resolveCustomizationMerge(merge, new Map(), local, remote);
    // existing entry keeps its nested path; new remote-only file uses basename.
    expect(result.desktop.js.map(pathOf)).toEqual([
      "app/desktop/js/a.js",
      "c.js",
    ]);
  });
});
