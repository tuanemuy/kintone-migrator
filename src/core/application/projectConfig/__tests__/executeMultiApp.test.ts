import { describe, expect, it } from "vitest";
import type {
  AppEntry,
  ExecutionPlan,
} from "@/core/domain/projectConfig/entity";
import { AppName } from "@/core/domain/projectConfig/valueObject";
import { executeMultiApp } from "../executeMultiApp";

function makeAppEntry(name: string, dependsOn: string[] = []): AppEntry {
  const appName = AppName.create(name);
  return {
    name: appName,
    appId: `${name}-id`,
    schemaFile: `schemas/${name}.yaml`,
    seedFile: `seeds/${name}.yaml`,
    customizeFile: `customize/${name}.yaml`,
    fieldAclFile: `field-acl/${name}.yaml`,
    viewFile: `view/${name}.yaml`,
    appAclFile: `app-acl/${name}.yaml`,
    recordAclFile: `record-acl/${name}.yaml`,
    processFile: `process/${name}.yaml`,
    settingsFile: `settings/${name}.yaml`,
    notificationFile: `notification/${name}.yaml`,
    reportFile: `report/${name}.yaml`,
    actionFile: `action/${name}.yaml`,
    adminNotesFile: `admin-notes/${name}.yaml`,
    pluginFile: `plugin/${name}.yaml`,
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
});
