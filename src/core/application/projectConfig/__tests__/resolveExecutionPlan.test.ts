import { describe, expect, it } from "vitest";
import { isNotFoundError, NotFoundErrorCode } from "@/core/application/error";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { AppName } from "@/core/domain/projectConfig/valueObject";
import { resolveExecutionPlan } from "../resolveExecutionPlan";

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

function makeConfig(
  appDefs: Array<{ name: string; dependsOn?: string[] }>,
): ProjectConfig {
  const apps = new Map<AppName, AppEntry>();
  for (const def of appDefs) {
    const name = AppName.create(def.name);
    apps.set(name, makeAppEntry(def.name, def.dependsOn));
  }
  return {
    domain: "example.cybozu.com",
    auth: { type: "apiToken", apiToken: "token" },
    apps,
  };
}

describe("resolveExecutionPlan", () => {
  it("resolves single app by name", () => {
    const config = makeConfig([
      { name: "customer" },
      { name: "order", dependsOn: ["customer"] },
    ]);

    const plan = resolveExecutionPlan({
      config,
      appName: "customer",
    });

    expect(plan.orderedApps).toHaveLength(1);
    expect(plan.orderedApps[0].name).toBe("customer");
  });

  it("resolves all apps in dependency order", () => {
    const config = makeConfig([
      { name: "customer" },
      { name: "order", dependsOn: ["customer"] },
      { name: "invoice", dependsOn: ["order"] },
    ]);

    const plan = resolveExecutionPlan({
      config,
      all: true,
    });

    expect(plan.orderedApps.map((a) => a.name)).toEqual([
      "customer",
      "order",
      "invoice",
    ]);
  });

  it("throws AppNotFound for unknown app name", () => {
    const config = makeConfig([{ name: "customer" }]);

    try {
      resolveExecutionPlan({ config, appName: "nonexistent" });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(isNotFoundError(error)).toBe(true);
      if (isNotFoundError(error)) {
        expect(error.code).toBe(NotFoundErrorCode.AppNotFound);
        expect(error.message).toContain("nonexistent");
      }
    }
  });
});
