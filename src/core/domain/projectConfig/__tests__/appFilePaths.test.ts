import { describe, expect, it } from "vitest";
import {
  type AppFilePaths,
  buildAppFilePaths,
  buildAppRevisionFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyStateFilePath,
  buildStateFilePath,
} from "../appFilePaths";
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

// W-002 (ADR-002 / arch-r2-S002): state uses an app-scoped directory layout
// (`state/<appName>/schema.yaml`, appName INSIDE) whose hierarchy is the inverse
// of buildAppFilePaths (`<appName>/...`, appName OUTSIDE). These tests pin the
// direction so a regression to `state/schema.yaml` (collapse) or
// `<appName>/state/schema.yaml` (direction flip) is caught.
describe("buildStateFilePath", () => {
  const appName = AppName.create("customer");

  it("appName 内側の state/<appName>/schema.yaml を返す", () => {
    expect(buildStateFilePath(appName)).toBe("state/customer/schema.yaml");
  });

  it("baseDir が指定されると state ディレクトリの外側に付与される", () => {
    expect(buildStateFilePath(appName, "output")).toBe(
      "output/state/customer/schema.yaml",
    );
  });
});

describe("buildLegacyStateFilePath", () => {
  it("legacy 単一アプリは state/schema.yaml を返す", () => {
    expect(buildLegacyStateFilePath()).toBe("state/schema.yaml");
  });

  it("baseDir が指定されると state ディレクトリの外側に付与される", () => {
    expect(buildLegacyStateFilePath("output")).toBe("output/state/schema.yaml");
  });
});

// ADR-188-001: revision is an app-scoped value stored once per app alongside
// the per-domain snapshots, with the same app-inside directory convention as
// buildStateFilePath.
describe("buildAppRevisionFilePath", () => {
  const appName = AppName.create("customer");

  it("appName 内側の state/<appName>/revision.yaml を返す", () => {
    expect(buildAppRevisionFilePath(appName)).toBe(
      "state/customer/revision.yaml",
    );
  });

  it("baseDir が指定されると state ディレクトリの外側に付与される", () => {
    expect(buildAppRevisionFilePath(appName, "output")).toBe(
      "output/state/customer/revision.yaml",
    );
  });
});

describe("buildLegacyAppRevisionFilePath", () => {
  it("legacy 単一アプリは state/revision.yaml を返す", () => {
    expect(buildLegacyAppRevisionFilePath()).toBe("state/revision.yaml");
  });

  it("baseDir が指定されると state ディレクトリの外側に付与される", () => {
    expect(buildLegacyAppRevisionFilePath("output")).toBe(
      "output/state/revision.yaml",
    );
  });
});
