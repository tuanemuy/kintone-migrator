import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { AppName } from "@/core/domain/projectConfig/valueObject";
import type { BaseContainerConfig } from "../createDomainConfigResolver";
import { createDomainConfigResolver } from "../createDomainConfigResolver";
import type { MultiAppCliValues } from "../projectConfig";

type TestCliValues = MultiAppCliValues & {
  "test-file"?: string;
};

type TestContainerConfig = BaseContainerConfig & {
  testFilePath: string;
};

function setupEnv() {
  vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
  vi.stubEnv("KINTONE_API_TOKEN", "test-token");
  vi.stubEnv("KINTONE_APP_ID", "42");
}

const baseValues: TestCliValues = {};

const buildConfig = (
  base: BaseContainerConfig,
  filePath: string,
): TestContainerConfig => ({
  ...base,
  testFilePath: filePath,
});

describe("createDomainConfigResolver", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolveFilePathがデフォルトのファイル名を返す", () => {
    const { resolveFilePath } = createDomainConfigResolver<
      TestContainerConfig,
      "test-file",
      TestCliValues
    >({
      fileArgKey: "test-file",
      envVar: () => undefined,
      appFileField: () => undefined,
      defaultDir: "test-dir",
      defaultFileName: "test.yaml",
      buildConfig,
    });

    expect(resolveFilePath(baseValues)).toBe("test.yaml");
  });

  it("resolveFilePathがCLI引数を優先する", () => {
    const { resolveFilePath } = createDomainConfigResolver<
      TestContainerConfig,
      "test-file",
      TestCliValues
    >({
      fileArgKey: "test-file",
      envVar: () => "env-path.yaml",
      appFileField: () => undefined,
      defaultDir: "test-dir",
      defaultFileName: "test.yaml",
      buildConfig,
    });

    expect(
      resolveFilePath({ ...baseValues, "test-file": "cli-path.yaml" }),
    ).toBe("cli-path.yaml");
  });

  it("resolveFilePathが環境変数をフォールバックとして使う", () => {
    const { resolveFilePath } = createDomainConfigResolver<
      TestContainerConfig,
      "test-file",
      TestCliValues
    >({
      fileArgKey: "test-file",
      envVar: () => "env-path.yaml",
      appFileField: () => undefined,
      defaultDir: "test-dir",
      defaultFileName: "test.yaml",
      buildConfig,
    });

    expect(resolveFilePath(baseValues)).toBe("env-path.yaml");
  });

  it("resolveContainerConfigが正しいconfigオブジェクトを返す", () => {
    setupEnv();

    const { resolveContainerConfig } = createDomainConfigResolver<
      TestContainerConfig,
      "test-file",
      TestCliValues
    >({
      fileArgKey: "test-file",
      envVar: () => undefined,
      appFileField: () => undefined,
      defaultDir: "test-dir",
      defaultFileName: "test.yaml",
      buildConfig,
    });

    const config = resolveContainerConfig(baseValues);
    expect(config).toEqual({
      baseUrl: "https://example.cybozu.com",
      auth: { type: "apiToken", apiToken: "test-token" },
      appId: "42",
      testFilePath: "test.yaml",
    });
  });

  it("resolveAppContainerConfigがappエントリからconfigを組み立てる", () => {
    const appName = AppName.create("my-app");
    const app: AppEntry = {
      name: appName,
      appId: "100",
      dependsOn: [],
    };

    const projectConfig: ProjectConfig = {
      domain: "project.cybozu.com",
      auth: { type: "apiToken", apiToken: "project-token" },
      apps: new Map([[appName, app]]),
    };

    const { resolveAppContainerConfig } = createDomainConfigResolver<
      TestContainerConfig,
      "test-file",
      TestCliValues
    >({
      fileArgKey: "test-file",
      envVar: () => undefined,
      appFileField: (a) =>
        a.name === "my-app" ? "custom-test.yaml" : undefined,
      defaultDir: "test-dir",
      defaultFileName: "test.yaml",
      buildConfig,
    });

    const config = resolveAppContainerConfig(app, projectConfig, baseValues);
    expect(config.baseUrl).toBe("https://project.cybozu.com");
    expect(config.appId).toBe("100");
    expect(config.testFilePath).toBe("custom-test.yaml");
  });

  it("envVarがモジュールロード時ではなく呼び出し時に評価される", () => {
    const { resolveFilePath } = createDomainConfigResolver<
      TestContainerConfig,
      "test-file",
      TestCliValues
    >({
      fileArgKey: "test-file",
      envVar: () => process.env.TEST_FILE_PATH,
      appFileField: () => undefined,
      defaultDir: "test-dir",
      defaultFileName: "test.yaml",
      buildConfig,
    });

    expect(resolveFilePath(baseValues)).toBe("test.yaml");

    vi.stubEnv("TEST_FILE_PATH", "lazy-loaded.yaml");
    expect(resolveFilePath(baseValues)).toBe("lazy-loaded.yaml");
  });
});
