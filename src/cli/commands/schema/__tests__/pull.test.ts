import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/core/application/error";
import type { PullSchemaOutput } from "@/core/application/formSchema/dto";
import type {
  FieldCode,
  FormSchemaThreeWayMerge,
} from "@/core/domain/formSchema/valueObject";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  kintoneArgs: {},
  multiAppArgs: {},
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
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
      values: { all?: boolean },
      handlers: {
        singleLegacy: () => Promise<void>;
        multiApp: () => Promise<void>;
      },
    ) => {
      if (values.all) {
        await handlers.multiApp();
        return;
      }
      await handlers.singleLegacy();
    },
  ),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/formSchema/pullSchema", () => ({
  pullSchema: vi.fn(),
  applyPulledMerge: vi.fn(),
}));

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import {
  applyPulledMerge,
  pullSchema,
} from "@/core/application/formSchema/pullSchema";
import command from "../pull";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(p.isCancel).mockReturnValue(false);
});

function noConflictMerge(): FormSchemaThreeWayMerge {
  return {
    fieldEntries: [],
    fieldConflicts: [],
    layoutConflict: false,
    baseLayout: [],
    localLayout: [],
    remoteLayout: [],
    hasConflict: false,
    baseFields: new Map(),
    localFields: new Map(),
    remoteFields: new Map(),
  };
}

function conflictMerge(): FormSchemaThreeWayMerge {
  const entry = {
    key: "name" as FieldCode,
    change: { kind: "conflict" as const },
  };
  return {
    fieldEntries: [entry],
    fieldConflicts: [entry],
    layoutConflict: false,
    baseLayout: [],
    localLayout: [],
    remoteLayout: [],
    hasConflict: true,
    baseFields: new Map(),
    localFields: new Map(),
    remoteFields: new Map(),
  };
}

function mergedOutput(
  merge: FormSchemaThreeWayMerge,
): Extract<PullSchemaOutput, { mode: "merged" }> {
  return {
    mode: "merged",
    merge,
    remoteRevision: "5",
    // remoteSchema is opaque to the CLI; cast a minimal stub.
    remoteSchema: {} as never,
  };
}

describe("pull コマンド", () => {
  it("--force のとき force:true で pull する", async () => {
    vi.mocked(pullSchema).mockResolvedValue({
      mode: "force",
      schemaText: "x",
    });

    await command.run({ values: { force: true } } as never);

    expect(pullSchema).toHaveBeenCalledWith({
      container: {},
      input: { force: true },
    });
  });

  it("conflict なしの merged は applyPulledMerge が呼ばれる", async () => {
    vi.mocked(pullSchema).mockResolvedValue(mergedOutput(noConflictMerge()));

    await command.run({ values: {} } as never);

    expect(applyPulledMerge).toHaveBeenCalled();
  });

  it("--ours で conflict を local 一括解決する", async () => {
    vi.mocked(pullSchema).mockResolvedValue(mergedOutput(conflictMerge()));

    await command.run({ values: { ours: true } } as never);

    expect(p.select).not.toHaveBeenCalled();
    const call = vi.mocked(applyPulledMerge).mock.calls[0]?.[0];
    expect(call?.input.resolution.fields.get("name" as FieldCode)).toBe(
      "local",
    );
  });

  it("--theirs で conflict を remote 一括解決する", async () => {
    vi.mocked(pullSchema).mockResolvedValue(mergedOutput(conflictMerge()));

    await command.run({ values: { theirs: true } } as never);

    const call = vi.mocked(applyPulledMerge).mock.calls[0]?.[0];
    expect(call?.input.resolution.fields.get("name" as FieldCode)).toBe(
      "remote",
    );
  });

  it("インタラクティブ選択で conflict を解決する", async () => {
    vi.mocked(pullSchema).mockResolvedValue(mergedOutput(conflictMerge()));
    vi.mocked(p.select).mockResolvedValue("remote" as never);

    await command.run({ values: {} } as never);

    expect(p.select).toHaveBeenCalled();
    expect(applyPulledMerge).toHaveBeenCalled();
  });

  it("conflict 解決を中断（isCancel）した場合 applyPulledMerge を呼ばない（AC-15）", async () => {
    vi.mocked(pullSchema).mockResolvedValue(mergedOutput(conflictMerge()));
    vi.mocked(p.select).mockResolvedValue(Symbol.for("cancel") as never);
    vi.mocked(p.isCancel).mockReturnValue(true);

    await command.run({ values: {} } as never);

    expect(applyPulledMerge).not.toHaveBeenCalled();
    expect(p.cancel).toHaveBeenCalledWith(expect.stringContaining("unchanged"));
  });

  it("--ours と --theirs の併用はエラー", async () => {
    await command.run({ values: { ours: true, theirs: true } } as never);

    const handled = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect(handled).toBeInstanceOf(ValidationError);
    expect(pullSchema).not.toHaveBeenCalled();
  });

  it("--all は未対応エラーになる", async () => {
    await command.run({ values: { all: true } } as never);

    const handled = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect(handled).toBeInstanceOf(ValidationError);
    expect((handled as ValidationError).message).toContain("--all");
    expect(pullSchema).not.toHaveBeenCalled();
  });
});
