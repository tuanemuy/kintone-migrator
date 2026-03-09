import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AppEntry } from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { resolveFilePath } from "../resolveFilePath";

function makeApp(overrides?: Partial<AppEntry>): AppEntry {
  return {
    name: "my-app" as AppName,
    appId: "1",
    dependsOn: [],
    ...overrides,
  };
}

describe("resolveFilePath", () => {
  it("cliValue が指定されている場合、最優先で返す", () => {
    const result = resolveFilePath({
      cliValue: "cli-path.yaml",
      envVar: "env-path.yaml",
      appFileField: () => "app-path.yaml",
      app: makeApp(),
      defaultDir: "default-dir",
      defaultFileName: "default.yaml",
    });
    expect(result).toBe("cli-path.yaml");
  });

  it("cliValue が undefined の場合、envVar をフォールバックで返す", () => {
    const result = resolveFilePath({
      cliValue: undefined,
      envVar: "env-path.yaml",
      appFileField: () => "app-path.yaml",
      app: makeApp(),
      defaultDir: "default-dir",
      defaultFileName: "default.yaml",
    });
    expect(result).toBe("env-path.yaml");
  });

  it("cliValue と envVar が undefined の場合、app + appFileField をフォールバックで返す", () => {
    const result = resolveFilePath({
      cliValue: undefined,
      envVar: undefined,
      appFileField: (a) => a.schemaFile,
      app: makeApp({ schemaFile: "custom-schema.yaml" }),
      defaultDir: "default-dir",
      defaultFileName: "default.yaml",
    });
    expect(result).toBe("custom-schema.yaml");
  });

  it("app のみ指定で appFileField が undefined を返す場合、join(defaultDir, app.name + '.yaml') を返す", () => {
    const result = resolveFilePath({
      cliValue: undefined,
      envVar: undefined,
      appFileField: (a) => a.schemaFile,
      app: makeApp(),
      defaultDir: "schemas",
      defaultFileName: "default.yaml",
    });
    expect(result).toBe(join("schemas", "my-app.yaml"));
  });

  it("全て undefined で app もない場合、defaultFileName を返す", () => {
    const result = resolveFilePath({
      cliValue: undefined,
      envVar: undefined,
      appFileField: undefined,
      app: undefined,
      defaultDir: "default-dir",
      defaultFileName: "default.yaml",
    });
    expect(result).toBe("default.yaml");
  });
});
