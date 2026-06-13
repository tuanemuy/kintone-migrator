import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ConflictErrorCode,
  ValidationError,
} from "@/core/application/error";
import { PUSH_DRIFT_MESSAGE } from "@/core/application/formSchema/pushSchema";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  kintoneArgs: {},
  multiAppArgs: {},
  confirmArgs: {},
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

vi.mock("@/core/application/formSchema/pushSchema", async () => {
  const actual = await vi.importActual<
    typeof import("@/core/application/formSchema/pushSchema")
  >("@/core/application/formSchema/pushSchema");
  return { ...actual, pushSchema: vi.fn() };
});

vi.mock("@/cli/output", () => ({
  confirmAndDeploy: vi.fn(),
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { confirmAndDeploy } from "@/cli/output";
import { pushSchema } from "@/core/application/formSchema/pushSchema";
import command from "../push";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(p.isCancel).mockReturnValue(false);
});

describe("push コマンド", () => {
  it("確認後に push し、その後 confirmAndDeploy が呼ばれる（AC-14）", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(pushSchema).mockResolvedValue({ mode: "push", revision: "2" });

    await command.run({ values: {} } as never);

    expect(pushSchema).toHaveBeenCalledWith({
      container: {},
      input: { force: false },
    });
    expect(confirmAndDeploy).toHaveBeenCalled();
  });

  it("ユーザーがキャンセルした場合 push しない", async () => {
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(pushSchema).not.toHaveBeenCalled();
    expect(confirmAndDeploy).not.toHaveBeenCalled();
  });

  it("--force のとき force:true で push する", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(pushSchema).mockResolvedValue({ mode: "push", revision: "2" });

    await command.run({ values: { force: true } } as never);

    expect(pushSchema).toHaveBeenCalledWith({
      container: {},
      input: { force: true },
    });
  });

  it("drift 由来 ConflictError（ConfigDrift）はそのままのメッセージで処理される", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    const driftError = new ConflictError(
      ConflictErrorCode.ConfigDrift,
      PUSH_DRIFT_MESSAGE,
    );
    vi.mocked(pushSchema).mockRejectedValue(driftError);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(driftError);
  });

  it("API 楽観ロック由来 ConflictError は TOCTOU メッセージに再ラップされる（ADR-008）", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    const apiError = new ConflictError(
      ConflictErrorCode.Conflict,
      "... (revision conflict — GAIA_CO02). Please retry the operation.",
    );
    vi.mocked(pushSchema).mockRejectedValue(apiError);

    await command.run({ values: {} } as never);

    const handled = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect(handled).toBeInstanceOf(ConflictError);
    expect((handled as ConflictError).message).toBe(
      "The remote changed while applying. Run `schema pull` and retry.",
    );
    expect((handled as ConflictError).message).not.toBe(PUSH_DRIFT_MESSAGE);
  });

  it("--all は未対応エラーになる", async () => {
    await command.run({ values: { all: true } } as never);

    const handled = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect(handled).toBeInstanceOf(ValidationError);
    expect((handled as ValidationError).message).toContain("--all");
    expect(pushSchema).not.toHaveBeenCalled();
  });
});
