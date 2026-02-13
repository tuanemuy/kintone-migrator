import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import type { AppEntry } from "../../entity";
import { ProjectConfigErrorCode } from "../../errorCode";
import { AppName } from "../../valueObject";
import { resolveExecutionOrder } from "../dependencyResolver";

function makeApp(name: string, dependsOn: string[] = []): [AppName, AppEntry] {
  const appName = AppName.create(name);
  return [
    appName,
    {
      name: appName,
      appId: `${name}-id`,
      schemaFile: `schemas/${name}.yaml`,
      dependsOn: dependsOn.map(AppName.create),
    },
  ];
}

describe("resolveExecutionOrder", () => {
  it("returns single app with no dependencies", () => {
    const apps = new Map([makeApp("customer")]);
    const plan = resolveExecutionOrder(apps);

    expect(plan.orderedApps).toHaveLength(1);
    expect(plan.orderedApps[0].name).toBe("customer");
  });

  it("resolves linear dependency chain", () => {
    const apps = new Map([
      makeApp("customer"),
      makeApp("order", ["customer"]),
      makeApp("invoice", ["order"]),
    ]);
    const plan = resolveExecutionOrder(apps);

    expect(plan.orderedApps.map((a) => a.name)).toEqual([
      "customer",
      "order",
      "invoice",
    ]);
  });

  it("resolves diamond dependency", () => {
    const apps = new Map([
      makeApp("base"),
      makeApp("left", ["base"]),
      makeApp("right", ["base"]),
      makeApp("top", ["left", "right"]),
    ]);
    const plan = resolveExecutionOrder(apps);

    const names = plan.orderedApps.map((a) => a.name);
    expect(names[0]).toBe("base");
    expect(names.indexOf(AppName.create("left"))).toBeLessThan(
      names.indexOf(AppName.create("top")),
    );
    expect(names.indexOf(AppName.create("right"))).toBeLessThan(
      names.indexOf(AppName.create("top")),
    );
    expect(names[names.length - 1]).toBe("top");
  });

  it("sorts same-level apps alphabetically", () => {
    const apps = new Map([
      makeApp("zebra"),
      makeApp("alpha"),
      makeApp("middle"),
    ]);
    const plan = resolveExecutionOrder(apps);

    expect(plan.orderedApps.map((a) => a.name)).toEqual([
      "alpha",
      "middle",
      "zebra",
    ]);
  });

  it("throws CircularDependency on direct cycle", () => {
    const apps = new Map([makeApp("a", ["b"]), makeApp("b", ["a"])]);

    try {
      resolveExecutionOrder(apps);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(ProjectConfigErrorCode.CircularDependency);
        expect(error.message).toContain("a");
        expect(error.message).toContain("b");
      }
    }
  });

  it("throws CircularDependency on indirect cycle", () => {
    const apps = new Map([
      makeApp("a", ["c"]),
      makeApp("b", ["a"]),
      makeApp("c", ["b"]),
    ]);

    try {
      resolveExecutionOrder(apps);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(ProjectConfigErrorCode.CircularDependency);
      }
    }
  });

  it("throws UnknownDependency for missing reference", () => {
    const apps = new Map([makeApp("a", ["nonexistent"])]);

    try {
      resolveExecutionOrder(apps);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(ProjectConfigErrorCode.UnknownDependency);
        expect(error.message).toContain("nonexistent");
      }
    }
  });

  it("handles complex dependency graph from plan example", () => {
    const apps = new Map([
      makeApp("customer"),
      makeApp("order", ["customer"]),
      makeApp("invoice", ["order", "customer"]),
    ]);
    const plan = resolveExecutionOrder(apps);

    expect(plan.orderedApps.map((a) => a.name)).toEqual([
      "customer",
      "order",
      "invoice",
    ]);
  });
});
