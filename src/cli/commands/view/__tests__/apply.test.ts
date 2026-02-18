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

vi.mock("@/cli/viewConfig", () => ({
  viewArgs: {},
  resolveViewContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    viewFilePath: "views.yaml",
  })),
  resolveViewAppContainerConfig: vi.fn(),
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

vi.mock("@/cli/output", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/cli/output")>()),
  printAppHeader: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  confirmArgs: {},
}));

vi.mock("@/core/application/container/viewCli", () => ({
  createViewCliContainer: vi.fn(() => ({
    appDeployer: { deploy: mockDeploy },
  })),
}));

vi.mock("@/core/application/view/applyView");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { applyView } from "@/core/application/view/applyView";
import command from "../apply";

afterEach(() => {
  vi.clearAllMocks();
});

describe("view apply command", () => {
  it("should apply views and show success message", async () => {
    vi.mocked(applyView).mockResolvedValue({ skippedBuiltinViews: [] });

    await command.run({ values: {} } as never);

    expect(applyView).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("successfully"),
    );
  });

  it("should confirm and deploy after apply", async () => {
    vi.mocked(applyView).mockResolvedValue({ skippedBuiltinViews: [] });
    vi.mocked(p.confirm).mockResolvedValue(true);

    await command.run({ values: {} } as never);

    expect(p.confirm).toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
  });

  it("should show warning when deploy is cancelled", async () => {
    vi.mocked(applyView).mockResolvedValue({ skippedBuiltinViews: [] });
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(mockDeploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("should skip confirmation with --yes flag", async () => {
    vi.mocked(applyView).mockResolvedValue({ skippedBuiltinViews: [] });

    await command.run({ values: { yes: true } } as never);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
  });

  it("should show warning for skipped builtin views", async () => {
    vi.mocked(applyView).mockResolvedValue({
      skippedBuiltinViews: ["assignee", "history"],
    });

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("assignee"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("history"));
  });

  it("should handle errors with handleCliError", async () => {
    const error = new Error("View apply failed");
    vi.mocked(applyView).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
