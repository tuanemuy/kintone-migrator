import { afterEach, describe, expect, it, vi } from "vitest";
import type { DetectSchemaThreeWayDiffOutput } from "@/core/application/formSchema/detectThreeWayDiff";

const mocks = vi.hoisted(() => ({
  spinnerStart: vi.fn(),
  spinnerStop: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: mocks.spinnerStart,
    stop: mocks.spinnerStop,
  })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
  note: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  kintoneArgs: {},
  multiAppArgs: {},
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    username: "user",
    password: "pass",
    appId: "1",
    schemaFilePath: "schema.yaml",
    stateSchemaFilePath: "state/schema.yaml",
  })),
}));

vi.mock("@/cli/projectConfig", () => ({
  resolveTarget: vi.fn(() => ({ mode: "single-legacy" })),
  printAvailableApps: vi.fn(),
  resolveAppCliConfig: vi.fn(),
  routeMultiApp: vi.fn(
    async (
      _values: unknown,
      handlers: { singleLegacy: () => Promise<void> },
    ) => {
      await handlers.singleLegacy();
    },
  ),
  runMultiAppWithFailCheck: vi.fn(),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/formSchema/detectThreeWayDiff");

// `createCliContainer` is mocked to `{}`, so the real detectDiff would fail on
// an undefined `schemaStorage` and mask the failure the published tests assert.
vi.mock("@/core/application/formSchema/detectDiff");

vi.mock("@/cli/output", () => ({
  printThreeWayDiffResult: vi.fn(),
  printDiffResult: vi.fn(),
  printSchemaDiffTarget: vi.fn(),
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import {
  printAppHeader,
  printDiffResult,
  printSchemaDiffTarget,
  printThreeWayDiffResult,
} from "@/cli/output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "@/cli/projectConfig";
import { createCliContainer } from "@/core/application/container/cli";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import { detectThreeWayDiff } from "@/core/application/formSchema/detectThreeWayDiff";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";
import command from "../diff";
import { formReadTargetArgs } from "../formReadTarget";

afterEach(() => {
  vi.clearAllMocks();
});

function twoWayResult(): DetectSchemaThreeWayDiffOutput {
  return {
    mode: "two-way",
    diff: {
      entries: [],
      schemaFields: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      hasLayoutChanges: false,
    },
  };
}

function threeWayResult(): DetectSchemaThreeWayDiffOutput {
  return {
    mode: "three-way",
    localChanges: [{ key: "name", label: "名前", kind: "localOnly" }],
    remoteDrift: [],
    conflicts: [],
    extras: [],
    isEmpty: false,
  };
}

describe("diff コマンド", () => {
  it("state がない場合、2-way 結果が printer に渡される", async () => {
    const mockResult = twoWayResult();
    vi.mocked(detectThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(detectThreeWayDiff).toHaveBeenCalled();
    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("state がある場合、3-way 結果が printer に渡される", async () => {
    const mockResult = threeWayResult();
    vi.mocked(detectThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API connection failed");
    vi.mocked(detectThreeWayDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(printThreeWayDiffResult).not.toHaveBeenCalled();
  });

  it("--published なしでは detectThreeWayDiff が呼ばれ detectDiff は呼ばれない", async () => {
    vi.mocked(detectThreeWayDiff).mockResolvedValue(twoWayResult());

    await command.run({ values: {} } as never);

    expect(detectThreeWayDiff).toHaveBeenCalled();
    expect(detectDiff).not.toHaveBeenCalled();
    expect(printSchemaDiffTarget).toHaveBeenCalledTimes(1);
    expect(printSchemaDiffTarget).toHaveBeenCalledWith("preview");
  });

  describe("--published", () => {
    function diffResult(): DetectDiffOutput {
      return {
        entries: [],
        schemaFields: [],
        summary: { added: 0, modified: 0, deleted: 0, total: 0 },
        isEmpty: true,
        hasLayoutChanges: false,
      };
    }

    // The other cases inject `values` directly, so they would still pass if the
    // flag were dropped from `args` -- and gunshi silently ignores unknown
    // options, making that break look like "published was read as preview".
    it("gunshi の args に published が登録されている", () => {
      expect(command.args).toHaveProperty("published");
      expect(command.args?.published).toEqual(formReadTargetArgs.published);
    });

    it("detectThreeWayDiff を経由せず detectDiff + printDiffResult を使う", async () => {
      const mockResult = diffResult();
      vi.mocked(detectDiff).mockResolvedValue(mockResult);

      await command.run({ values: { published: true } } as never);

      expect(detectDiff).toHaveBeenCalledWith(
        expect.objectContaining({ input: { target: "published" } }),
      );
      expect(detectThreeWayDiff).not.toHaveBeenCalled();
      expect(printDiffResult).toHaveBeenCalledWith(mockResult);
      expect(printThreeWayDiffResult).not.toHaveBeenCalled();
    });

    it("比較対象ラベルが published で 1 回出力される", async () => {
      vi.mocked(detectDiff).mockResolvedValue(diffResult());

      await command.run({ values: { published: true } } as never);

      expect(printSchemaDiffTarget).toHaveBeenCalledTimes(1);
      expect(printSchemaDiffTarget).toHaveBeenCalledWith("published");
    });

    it("detectDiff が例外を投げると spinner が Comparison failed. で停止し handleCliError に到達する", async () => {
      const error = new Error("not deployed");
      vi.mocked(detectDiff).mockRejectedValue(error);

      await command.run({ values: { published: true } } as never);

      expect(mocks.spinnerStop).toHaveBeenCalledWith("Comparison failed.");
      expect(mocks.spinnerStop).not.toHaveBeenCalledWith(
        "Comparison complete.",
      );
      expect(handleCliError).toHaveBeenCalledWith(error);
      expect(printDiffResult).not.toHaveBeenCalled();
    });

    it("spinner の開始・成功文言は preview と共通である", async () => {
      vi.mocked(detectDiff).mockResolvedValue(diffResult());

      await command.run({ values: { published: true } } as never);

      expect(mocks.spinnerStart).toHaveBeenCalledWith("Comparing schema...");
      expect(mocks.spinnerStop).toHaveBeenCalledWith("Comparison complete.");
    });

    it("--all では各アプリのコンテナに published が伝播しラベルもアプリごとに 1 回出る", async () => {
      const apps = [
        { name: "a", appId: "11" },
        { name: "b", appId: "22" },
      ];
      const configs = apps.map((app) => ({ appId: app.appId }));
      const containers = apps.map((app) => ({ marker: app.name }));
      vi.mocked(detectDiff).mockResolvedValue(diffResult());
      for (const config of configs) {
        vi.mocked(resolveAppCliConfig).mockReturnValueOnce(config as never);
      }
      for (const container of containers) {
        vi.mocked(createCliContainer).mockReturnValueOnce(container as never);
      }
      vi.mocked(routeMultiApp).mockImplementationOnce((async (
        _values: unknown,
        handlers: {
          multiApp: (plan: unknown, projectConfig: unknown) => Promise<void>;
        },
      ) => {
        await handlers.multiApp({ orderedApps: apps }, { apps: new Map() });
      }) as never);
      vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce((async (
        plan: { orderedApps: typeof apps },
        executor: (app: (typeof apps)[number]) => Promise<void>,
      ) => {
        for (const app of plan.orderedApps) {
          await executor(app);
        }
      }) as never);

      await command.run({ values: { published: true, all: true } } as never);

      expect(printAppHeader).toHaveBeenCalledTimes(2);
      expect(printAppHeader).toHaveBeenNthCalledWith(1, "a", "11");
      expect(printAppHeader).toHaveBeenNthCalledWith(2, "b", "22");

      expect(createCliContainer).toHaveBeenCalledTimes(2);
      expect(createCliContainer).toHaveBeenNthCalledWith(1, configs[0]);
      expect(createCliContainer).toHaveBeenNthCalledWith(2, configs[1]);

      expect(detectDiff).toHaveBeenCalledTimes(2);
      expect(detectDiff).toHaveBeenNthCalledWith(1, {
        container: containers[0],
        input: { target: "published" },
      });
      expect(detectDiff).toHaveBeenNthCalledWith(2, {
        container: containers[1],
        input: { target: "published" },
      });
      expect(detectThreeWayDiff).not.toHaveBeenCalled();

      expect(printSchemaDiffTarget).toHaveBeenCalledTimes(2);
      expect(printSchemaDiffTarget).toHaveBeenNthCalledWith(1, "published");
      expect(printSchemaDiffTarget).toHaveBeenNthCalledWith(2, "published");
      expect(printDiffResult).toHaveBeenCalledTimes(2);
      expect(printThreeWayDiffResult).not.toHaveBeenCalled();
      expect(handleCliError).not.toHaveBeenCalled();
    });
  });
});
