import { afterEach, describe, expect, it, vi } from "vitest";

const mockDeploy = vi.fn();

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  confirm: vi.fn(() => true),
  outro: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock("@/cli/fieldAclConfig", () => ({
  fieldAclArgs: {},
  resolveFieldAclContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    fieldAclFilePath: "field-acl.yaml",
  })),
  resolveFieldAclAppContainerConfig: vi.fn(),
}));

vi.mock("@/cli/projectConfig", () => ({
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

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  confirmArgs: {},
}));

vi.mock("@/core/application/container/cli", () => ({
  createFieldPermissionCliContainer: vi.fn(() => ({
    appDeployer: { deploy: mockDeploy },
  })),
}));

vi.mock("@/core/application/fieldPermission/applyFieldPermission");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { applyFieldPermission } from "@/core/application/fieldPermission/applyFieldPermission";
import command from "../field-acl";

afterEach(() => {
  vi.clearAllMocks();
});

describe("field-acl コマンド", () => {
  it("フィールド権限の適用に成功し、成功メッセージが表示される", async () => {
    vi.mocked(applyFieldPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(applyFieldPermission).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("successfully"),
    );
  });

  it("適用後にデプロイの確認が行われる", async () => {
    vi.mocked(applyFieldPermission).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(true);

    await command.run({ values: {} } as never);

    expect(p.confirm).toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
  });

  it("デプロイをキャンセルした場合、警告メッセージが表示される", async () => {
    vi.mocked(applyFieldPermission).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(mockDeploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("運用環境には反映されていません"),
    );
  });

  it("--yes フラグで確認をスキップしてデプロイされる", async () => {
    vi.mocked(applyFieldPermission).mockResolvedValue(undefined);

    await command.run({ values: { yes: true } } as never);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("Permission apply failed");
    vi.mocked(applyFieldPermission).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
