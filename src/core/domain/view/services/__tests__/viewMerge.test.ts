import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import type { ViewConfig, ViewsConfig } from "../../entity";
import {
  computeViewThreeWayMerge,
  isViewConfigEqual,
  resolveViewMerge,
} from "../viewMerge";

function view(name: string, overrides: Partial<ViewConfig> = {}): ViewConfig {
  return { type: "LIST", index: 0, name, ...overrides };
}

function config(...views: ViewConfig[]): ViewsConfig {
  return { views: Object.fromEntries(views.map((v) => [v.name, v])) };
}

describe("isViewConfigEqual", () => {
  it("treats undefined and empty string as equal for optional fields", () => {
    expect(
      isViewConfigEqual(
        view("a", { filterCond: undefined }),
        view("a", { filterCond: "" }),
      ),
    ).toBe(true);
  });

  it("treats undefined and false pager as equal", () => {
    expect(
      isViewConfigEqual(
        view("a", { pager: undefined }),
        view("a", { pager: false }),
      ),
    ).toBe(true);
  });

  it("detects index changes (reordering is a change)", () => {
    expect(
      isViewConfigEqual(view("a", { index: 0 }), view("a", { index: 1 })),
    ).toBe(false);
  });

  it("compares fields by value", () => {
    expect(
      isViewConfigEqual(
        view("a", { fields: ["x"] }),
        view("a", { fields: ["x"] }),
      ),
    ).toBe(true);
    expect(
      isViewConfigEqual(
        view("a", { fields: ["x"] }),
        view("a", { fields: ["y"] }),
      ),
    ).toBe(false);
  });
});

describe("computeViewThreeWayMerge", () => {
  it("classifies a local-only change", () => {
    const base = config(view("a", { title: "base" }));
    const local = config(view("a", { title: "local" }));
    const remote = config(view("a", { title: "base" }));

    const merge = computeViewThreeWayMerge(base, local, remote);

    expect(merge.hasConflict).toBe(false);
    const entry = merge.entries.find((e) => e.key === "a");
    expect(entry?.change.kind).toBe("localOnly");
  });

  it("classifies a remote-only change as drift", () => {
    const base = config(view("a", { title: "base" }));
    const local = config(view("a", { title: "base" }));
    const remote = config(view("a", { title: "remote" }));

    const merge = computeViewThreeWayMerge(base, local, remote);

    const entry = merge.entries.find((e) => e.key === "a");
    expect(entry?.change.kind).toBe("remoteOnly");
  });

  it("classifies divergent changes as a conflict", () => {
    const base = config(view("a", { title: "base" }));
    const local = config(view("a", { title: "local" }));
    const remote = config(view("a", { title: "remote" }));

    const merge = computeViewThreeWayMerge(base, local, remote);

    expect(merge.hasConflict).toBe(true);
    expect(merge.conflicts.map((c) => c.key)).toEqual(["a"]);
  });
});

describe("resolveViewMerge", () => {
  it("keeps auto-merged local-only changes", () => {
    const base = config(view("a", { title: "base" }));
    const local = config(view("a", { title: "local" }));
    const remote = config(view("a", { title: "base" }));
    const merge = computeViewThreeWayMerge(base, local, remote);

    const resolved = resolveViewMerge(merge, new Map());

    expect(resolved.views.a.title).toBe("local");
  });

  it("applies the chosen side for conflicts", () => {
    const base = config(view("a", { title: "base" }));
    const local = config(view("a", { title: "local" }));
    const remote = config(view("a", { title: "remote" }));
    const merge = computeViewThreeWayMerge(base, local, remote);

    const oursResolved = resolveViewMerge(merge, new Map([["a", "local"]]));
    expect(oursResolved.views.a.title).toBe("local");

    const theirsResolved = resolveViewMerge(merge, new Map([["a", "remote"]]));
    expect(theirsResolved.views.a.title).toBe("remote");
  });

  it("throws a BusinessRuleError when a conflict is left unresolved", () => {
    const base = config(view("a", { title: "base" }));
    const local = config(view("a", { title: "local" }));
    const remote = config(view("a", { title: "remote" }));
    const merge = computeViewThreeWayMerge(base, local, remote);

    let thrown: unknown;
    try {
      resolveViewMerge(merge, new Map());
    } catch (e) {
      thrown = e;
    }
    expect(isBusinessRuleError(thrown)).toBe(true);
  });

  it("drops views deleted on both sides", () => {
    const base = config(view("a"), view("b"));
    const local = config(view("a"));
    const remote = config(view("a"));
    const merge = computeViewThreeWayMerge(base, local, remote);

    const resolved = resolveViewMerge(merge, new Map());

    expect(Object.keys(resolved.views)).toEqual(["a"]);
  });
});
