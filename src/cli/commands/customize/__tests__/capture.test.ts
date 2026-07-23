import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeBasePath, deriveFilePrefix } from "../capture";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
  },
  note: vi.fn(),
  outro: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
}));

vi.mock("../../../customizeConfig", () => ({
  customizeArgs: {},
  resolveCustomizeConfig: vi.fn(() => ({
    customizeFilePath: "customize.yaml",
  })),
  resolveCustomizeAppConfig: vi.fn(),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCustomizationCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/customization/captureCustomization", () => ({
  captureCustomization: vi.fn().mockResolvedValue({
    configText: "x",
    hasExistingConfig: false,
    fileResourceCount: 0,
  }),
}));

vi.mock("@/core/application/customization/saveCustomization", () => ({
  saveCustomization: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../handleError", () => ({
  handleCliError: vi.fn(),
}));

vi.mock("../../../output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("../../../projectConfig", () => ({
  routeMultiApp: vi.fn(
    async (
      _values: unknown,
      handlers: { singleLegacy: () => Promise<void> },
    ) => {
      await handlers.singleLegacy();
    },
  ),
  resolveAppCliConfig: vi.fn(),
  runMultiAppWithFailCheck: vi.fn(),
}));

describe("deriveFilePrefix", () => {
  it("customize.yaml は空文字を返す", () => {
    expect(deriveFilePrefix("customize.yaml")).toBe("");
  });

  it("ディレクトリ内の customize.yaml は空文字を返す", () => {
    expect(deriveFilePrefix("myapp/customize.yaml")).toBe("");
  });

  it("深いパスの customize.yaml は空文字を返す", () => {
    expect(deriveFilePrefix("path/to/customer/customize.yaml")).toBe("");
  });

  it("絶対パスの customize.yaml は空文字を返す", () => {
    expect(deriveFilePrefix("/project/apps/myapp/customize.yaml")).toBe("");
  });

  it("customize以外のファイル名はそのファイル名を返す", () => {
    expect(deriveFilePrefix("custom-settings.yaml")).toBe("custom-settings");
  });

  it("ディレクトリ内の customize以外のファイル名はファイル名を返す", () => {
    expect(deriveFilePrefix("some-dir/my-config.yaml")).toBe("my-config");
  });

  it("マルチアプリ形式のパスはアプリ名を返す", () => {
    expect(deriveFilePrefix("customize/customer.yaml")).toBe("customer");
  });

  it(".yml 拡張子のファイルも正しくファイル名を返す", () => {
    expect(deriveFilePrefix("my-config.yml")).toBe("my-config");
  });

  it("ディレクトリ内の .yml ファイルも正しくファイル名を返す", () => {
    expect(deriveFilePrefix("some-dir/my-config.yml")).toBe("my-config");
  });
});

/**
 * pull resolves file content against `join(captureBasePath, filePrefix)`, while
 * push resolves against `computeBasePath(...)`. This invariant pins that the two
 * bases are structurally identical for the same input, so pull writes exactly
 * where push uploads from (AC-10).
 */
describe("pull/push base path invariant (AC-10)", () => {
  const paths = [
    "customize.yaml",
    "myapp/customize.yaml",
    "customize/customer.yaml",
    "/project/apps/myapp/customize.yaml",
    "some-dir/my-config.yml",
  ];

  for (const path of paths) {
    it(`join(captureBasePath, filePrefix) equals computeBasePath for ${path}`, () => {
      // These mirror how src/cli/commands/customize/pull.ts derives its bases.
      const captureBasePath = dirname(resolve(path));
      const filePrefix = deriveFilePrefix(path);
      expect(join(captureBasePath, filePrefix)).toBe(computeBasePath(path));
    });
  }
});

describe("customize capture command (deprecation)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deprecation warning を表示しつつ capture を実行する", async () => {
    const p = await import("@clack/prompts");
    const { captureCustomization } = await import(
      "@/core/application/customization/captureCustomization"
    );
    const command = (await import("../capture")).default;

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("customize pull"),
    );
    expect(captureCustomization).toHaveBeenCalled();
  });
});
