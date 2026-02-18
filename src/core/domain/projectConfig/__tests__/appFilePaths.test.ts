import { describe, expect, it } from "vitest";
import { type AppFilePaths, buildAppFilePaths } from "../appFilePaths";
import { AppName } from "../valueObject";

describe("buildAppFilePaths", () => {
  const appName = AppName.create("customer");

  it("returns paths without baseDir prefix when baseDir is omitted", () => {
    const paths = buildAppFilePaths(appName);

    expect(paths.schema).toBe("schemas/customer.yaml");
    expect(paths.seed).toBe("seeds/customer.yaml");
    expect(paths.customize).toBe("customize/customer.yaml");
    expect(paths.view).toBe("view/customer.yaml");
    expect(paths.settings).toBe("settings/customer.yaml");
    expect(paths.notification).toBe("notification/customer.yaml");
    expect(paths.report).toBe("report/customer.yaml");
    expect(paths.action).toBe("action/customer.yaml");
    expect(paths.process).toBe("process/customer.yaml");
    expect(paths.fieldAcl).toBe("field-acl/customer.yaml");
    expect(paths.appAcl).toBe("app-acl/customer.yaml");
    expect(paths.recordAcl).toBe("record-acl/customer.yaml");
    expect(paths.adminNotes).toBe("admin-notes/customer.yaml");
    expect(paths.plugin).toBe("plugin/customer.yaml");
  });

  it("returns paths prefixed with baseDir when baseDir is provided", () => {
    const paths = buildAppFilePaths(appName, "output");

    expect(paths.schema).toBe("output/schemas/customer.yaml");
    expect(paths.seed).toBe("output/seeds/customer.yaml");
    expect(paths.customize).toBe("output/customize/customer.yaml");
    expect(paths.view).toBe("output/view/customer.yaml");
    expect(paths.settings).toBe("output/settings/customer.yaml");
    expect(paths.notification).toBe("output/notification/customer.yaml");
    expect(paths.report).toBe("output/report/customer.yaml");
    expect(paths.action).toBe("output/action/customer.yaml");
    expect(paths.process).toBe("output/process/customer.yaml");
    expect(paths.fieldAcl).toBe("output/field-acl/customer.yaml");
    expect(paths.appAcl).toBe("output/app-acl/customer.yaml");
    expect(paths.recordAcl).toBe("output/record-acl/customer.yaml");
    expect(paths.adminNotes).toBe("output/admin-notes/customer.yaml");
    expect(paths.plugin).toBe("output/plugin/customer.yaml");
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
