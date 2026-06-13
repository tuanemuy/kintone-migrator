import { afterEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/core/application/error";
import type {
  AppEntry,
  ExecutionPlan,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";

vi.mock("@clack/prompts", () => ({
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
    message: vi.fn(),
  },
  note: vi.fn(),
}));

vi.mock("../handleError", () => ({
  logError: vi.fn(),
}));

vi.mock("../output", () => ({
  printMultiAppResult: vi.fn(),
  printAppHeader: vi.fn(),
}));

vi.mock("@/core/application/projectConfig/executeMultiApp", () => ({
  executeMultiApp: vi.fn(),
}));

import * as p from "@clack/prompts";
import { executeMultiApp } from "@/core/application/projectConfig/executeMultiApp";
import { printMultiAppResult } from "../output";
import {
  runMultiAppWithFailCheck,
  validateExclusiveArgs,
} from "../projectConfig";

afterEach(() => {
  vi.clearAllMocks();
});

describe("validateExclusiveArgs", () => {
  it("--app と --all が同時に指定された場合、ValidationError をスローする", () => {
    expect(() => validateExclusiveArgs({ app: "myApp", all: true })).toThrow(
      ValidationError,
    );
  });

  it("--app-id と --app が同時に指定された場合、ValidationError をスローする", () => {
    expect(() =>
      validateExclusiveArgs({ "app-id": "1", app: "myApp" }),
    ).toThrow(ValidationError);
  });

  it("--app-id と --all が同時に指定された場合、ValidationError をスローする", () => {
    expect(() => validateExclusiveArgs({ "app-id": "1", all: true })).toThrow(
      ValidationError,
    );
  });

  it("--app のみ指定した場合、エラーにならない", () => {
    expect(() => validateExclusiveArgs({ app: "myApp" })).not.toThrow();
  });

  it("--all のみ指定した場合、エラーにならない", () => {
    expect(() => validateExclusiveArgs({ all: true })).not.toThrow();
  });

  it("何も指定しない場合、エラーにならない", () => {
    expect(() => validateExclusiveArgs({})).not.toThrow();
  });

  it("--app-id のみ指定した場合、エラーにならない", () => {
    expect(() => validateExclusiveArgs({ "app-id": "1" })).not.toThrow();
  });

  it("--app-id, --app, --all を全て指定した場合、ValidationError をスローする", () => {
    expect(() =>
      validateExclusiveArgs({ "app-id": "1", app: "myApp", all: true }),
    ).toThrow(ValidationError);
  });
});

function makeApp(name: string): AppEntry {
  return {
    name: name as AppName,
    appId: "1",
    dependsOn: [],
  };
}

function makePlan(apps: AppEntry[]): ExecutionPlan {
  return { orderedApps: apps };
}

describe("runMultiAppWithFailCheck", () => {
  it("全アプリ成功時、successMessage が指定されていればログ出力される", async () => {
    const plan = makePlan([makeApp("App1"), makeApp("App2")]);
    vi.mocked(executeMultiApp).mockResolvedValue({
      results: [
        { name: "App1" as AppName, status: "succeeded" },
        { name: "App2" as AppName, status: "succeeded" },
      ],
      hasFailure: false,
    });

    await runMultiAppWithFailCheck(plan, vi.fn(), "All done!");

    expect(p.log.success).toHaveBeenCalledWith("All done!");
  });

  it("失敗がある場合、EXECUTION_ERROR コードの SystemError をスローする", async () => {
    const plan = makePlan([makeApp("App1")]);
    vi.mocked(executeMultiApp).mockResolvedValue({
      results: [
        {
          name: "App1" as AppName,
          status: "failed",
          error: new Error("fail"),
        },
      ],
      hasFailure: true,
    });

    await expect(runMultiAppWithFailCheck(plan, vi.fn())).rejects.toThrow(
      expect.objectContaining({
        code: "EXECUTION_ERROR",
      }),
    );
  });

  it("executor が {ok:false} を返す場合、実体の executeMultiApp 経由で EXECUTION_ERROR の SystemError をスローする", async () => {
    // Integration path: do NOT mock executeMultiApp's verdict. Delegate to the
    // real implementation so the full wiring is exercised — executor returns
    // { ok: false } → executeMultiApp sets status "failed" → hasFailure true →
    // runMultiAppWithFailCheck throws. This binds the seam the other (mocked)
    // case leaves untested.
    const { executeMultiApp: realExecuteMultiApp } = await vi.importActual<
      typeof import("@/core/application/projectConfig/executeMultiApp")
    >("@/core/application/projectConfig/executeMultiApp");
    vi.mocked(executeMultiApp).mockImplementation(realExecuteMultiApp);

    const plan = makePlan([makeApp("App1")]);

    await expect(
      runMultiAppWithFailCheck(plan, async () => ({
        ok: false,
        error: new Error("fail"),
      })),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "EXECUTION_ERROR",
      }),
    );

    // Closes the misclassification gap end-to-end: the result handed to
    // printMultiAppResult (called before the throw) must mark the app "failed",
    // not "succeeded" (AC-1, Issue's core "status misclassification").
    const multiResult = vi.mocked(printMultiAppResult).mock.calls[0][0];
    expect(multiResult.results[0].status).toBe("failed");
    expect(multiResult.results[0].status).not.toBe("succeeded");
  });

  it("executor が {ok:true} を返す場合、実体の executeMultiApp 経由でスローせず正常完了する", async () => {
    // Integration mirror: real executeMultiApp with an { ok: true } executor must
    // NOT throw (fail-fast not erroneously triggered).
    const { executeMultiApp: realExecuteMultiApp } = await vi.importActual<
      typeof import("@/core/application/projectConfig/executeMultiApp")
    >("@/core/application/projectConfig/executeMultiApp");
    vi.mocked(executeMultiApp).mockImplementation(realExecuteMultiApp);

    const plan = makePlan([makeApp("App1"), makeApp("App2")]);

    await expect(
      runMultiAppWithFailCheck(plan, async () => ({ ok: true })),
    ).resolves.toBeUndefined();
  });

  it("successMessage が指定されていない場合、成功ログは出力されない", async () => {
    const plan = makePlan([makeApp("App1")]);
    vi.mocked(executeMultiApp).mockResolvedValue({
      results: [{ name: "App1" as AppName, status: "succeeded" }],
      hasFailure: false,
    });

    await runMultiAppWithFailCheck(plan, vi.fn());

    expect(p.log.success).not.toHaveBeenCalled();
  });
});
