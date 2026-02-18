import { describe, expect, it } from "vitest";
import { type AppFilePaths, buildAppFilePaths } from "../appFilePaths";
import { AppName } from "../valueObject";

describe("buildAppFilePaths", () => {
  const appName = AppName.create("customer");

  it("returns paths without baseDir prefix when baseDir is omitted", () => {
    const paths = buildAppFilePaths(appName);

    expect(paths.schema).toBe("customer/schema.yaml");
    expect(paths.seed).toBe("customer/seed.yaml");
    expect(paths.customize).toBe("customer/customize.yaml");
    expect(paths.view).toBe("customer/view.yaml");
    expect(paths.settings).toBe("customer/settings.yaml");
    expect(paths.notification).toBe("customer/notification.yaml");
    expect(paths.report).toBe("customer/report.yaml");
    expect(paths.action).toBe("customer/action.yaml");
    expect(paths.process).toBe("customer/process.yaml");
    expect(paths.fieldAcl).toBe("customer/field-acl.yaml");
    expect(paths.appAcl).toBe("customer/app-acl.yaml");
    expect(paths.recordAcl).toBe("customer/record-acl.yaml");
    expect(paths.adminNotes).toBe("customer/admin-notes.yaml");
    expect(paths.plugin).toBe("customer/plugin.yaml");
  });

  it("returns paths prefixed with baseDir when baseDir is provided", () => {
    const paths = buildAppFilePaths(appName, "output");

    expect(paths.schema).toBe("output/customer/schema.yaml");
    expect(paths.seed).toBe("output/customer/seed.yaml");
    expect(paths.customize).toBe("output/customer/customize.yaml");
    expect(paths.view).toBe("output/customer/view.yaml");
    expect(paths.settings).toBe("output/customer/settings.yaml");
    expect(paths.notification).toBe("output/customer/notification.yaml");
    expect(paths.report).toBe("output/customer/report.yaml");
    expect(paths.action).toBe("output/customer/action.yaml");
    expect(paths.process).toBe("output/customer/process.yaml");
    expect(paths.fieldAcl).toBe("output/customer/field-acl.yaml");
    expect(paths.appAcl).toBe("output/customer/app-acl.yaml");
    expect(paths.recordAcl).toBe("output/customer/record-acl.yaml");
    expect(paths.adminNotes).toBe("output/customer/admin-notes.yaml");
    expect(paths.plugin).toBe("output/customer/plugin.yaml");
  });

  it("returns all 14 fields", () => {
    const paths = buildAppFilePaths(appName);
    const expectedKeys: readonly (keyof AppFilePaths)[] = [
      "schema",
      "seed",
      "customize",
      "view",
      "settings",
      "notification",
      "report",
      "action",
      "process",
      "fieldAcl",
      "appAcl",
      "recordAcl",
      "adminNotes",
      "plugin",
    ];

    expect(Object.keys(paths).sort()).toEqual([...expectedKeys].sort());
  });
});
