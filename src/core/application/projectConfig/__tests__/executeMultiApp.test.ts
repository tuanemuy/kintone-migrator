import { describe, expect, it } from "vitest";
import type {
  AppEntry,
  ExecutionPlan,
} from "@/core/domain/projectConfig/entity";
import { AppName } from "@/core/domain/projectConfig/valueObject";
import { executeMultiApp } from "../executeMultiApp";

function makeAppEntry(name: string, dependsOn: string[] = []): AppEntry {
  return {
    name: AppName.create(name),
    appId: `${name}-id`,
    dependsOn: dependsOn.map(AppName.create),
  };
}

function makePlan(names: string[]): ExecutionPlan {
  return {
    orderedApps: names.map((name) => makeAppEntry(name)),
  };
}

describe("executeMultiApp", () => {
  it("executes all apps successfully", async () => {
    const plan = makePlan(["a", "b", "c"]);
    const executed: string[] = [];

    const result = await executeMultiApp(plan, async (app) => {
      executed.push(app.name);
    });

    expect(executed).toEqual(["a", "b", "c"]);
    expect(result.hasFailure).toBe(false);
    expect(result.results).toHaveLength(3);
    expect(result.results.every((r) => r.status === "succeeded")).toBe(true);
  });

  it("stops on failure and skips remaining apps", async () => {
    const plan = makePlan(["a", "b", "c"]);
    const executed: string[] = [];

    const result = await executeMultiApp(plan, async (app) => {
      executed.push(app.name);
      if (app.name === "b") {
        throw new Error("b failed");
      }
    });

    expect(executed).toEqual(["a", "b"]);
    expect(result.hasFailure).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].status).toBe("succeeded");
    expect(result.results[1].status).toBe("failed");
    expect(result.results[1].error).toBeDefined();
    expect(result.results[2].status).toBe("skipped");
  });

  it("handles failure on first app", async () => {
    const plan = makePlan(["a", "b"]);

    const result = await executeMultiApp(plan, async (app) => {
      if (app.name === "a") {
        throw new Error("a failed");
      }
    });

    expect(result.hasFailure).toBe(true);
    expect(result.results[0].status).toBe("failed");
    expect(result.results[1].status).toBe("skipped");
  });

  it("handles empty plan", async () => {
    const plan = makePlan([]);

    const result = await executeMultiApp(plan, async () => {
      // noop
    });

    expect(result.hasFailure).toBe(false);
    expect(result.results).toHaveLength(0);
  });

  it("treats { ok: false } return as failure and fail-fasts remaining apps", async () => {
    const plan = makePlan(["a", "b", "c"]);
    const executed: string[] = [];

    const result = await executeMultiApp(plan, async (app) => {
      executed.push(app.name);
      if (app.name === "a") {
        return { ok: false, error: new Error("a failed") };
      }
      return { ok: true };
    });

    // Fail-fast: executor must not be called for apps after the failure (AC-2).
    expect(executed).toEqual(["a"]);
    expect(result.hasFailure).toBe(true);
    // The failed app is "failed" and explicitly NOT "succeeded" (AC-1 misclassification guard).
    expect(result.results[0].status).toBe("failed");
    expect(result.results[0].status).not.toBe("succeeded");
    expect(result.results[0].error).toBeDefined();
    expect(result.results[1].status).toBe("skipped");
    expect(result.results[2].status).toBe("skipped");
  });

  it("treats { ok: false } with omitted error as failure with undefined error", async () => {
    const plan = makePlan(["a", "b"]);

    // Type contract boundary: `error` is optional on `{ ok: false }`. An executor
    // may omit it; the use-case layer does NOT fabricate a fallback Error (it has
    // no context). The app must still be "failed" / hasFailure, with error undefined.
    const result = await executeMultiApp(plan, async (app) => {
      if (app.name === "a") {
        return { ok: false };
      }
      return { ok: true };
    });

    expect(result.hasFailure).toBe(true);
    expect(result.results[0].status).toBe("failed");
    expect(result.results[0].status).not.toBe("succeeded");
    expect(result.results[0].error).toBeUndefined();
    expect(result.results[1].status).toBe("skipped");
  });

  it("treats { ok: true } return as success", async () => {
    const plan = makePlan(["a", "b"]);

    const result = await executeMultiApp(plan, async () => {
      return { ok: true };
    });

    expect(result.hasFailure).toBe(false);
    expect(result.results.every((r) => r.status === "succeeded")).toBe(true);
  });

  it("treats async void return as success (backward compatibility)", async () => {
    const plan = makePlan(["a", "b"]);

    // Mirrors real executors: `await someAsyncWork()` then implicit return undefined.
    const result = await executeMultiApp(plan, async () => {});

    expect(result.hasFailure).toBe(false);
    expect(result.results.every((r) => r.status === "succeeded")).toBe(true);
  });
});
