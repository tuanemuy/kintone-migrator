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
