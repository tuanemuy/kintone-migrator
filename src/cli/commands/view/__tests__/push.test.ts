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
  cancel: vi.fn(),
  note: vi.fn(),
}));

vi.mock("@/cli/viewConfig", () => ({
  viewArgs: {},
  resolveViewContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    viewFilePath: "views.yaml",
    viewStateFilePath: "state/view.yaml",
    appRevisionFilePath: "state/revision.yaml",
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

vi.mock("@/cli/config", () => ({
  confirmArgs: {},
}));

vi.mock("@/core/application/container/viewCli", () => ({
  createViewCliContainer: vi.fn(() => ({
    appDeployer: { deploy: mockDeploy },
  })),
}));

vi.mock("@/core/application/view/pushView");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import {
  ConflictError,
  ConflictErrorCode,
  isConflictError,
} from "@/core/application/error";
import { pushView } from "@/core/application/view/pushView";
import command from "../push";

afterEach(() => {
  vi.clearAllMocks();
});

describe("view push command", () => {
  it("pushes and deploys on success", async () => {
    vi.mocked(pushView).mockResolvedValue({
      mode: "push",
      revision: "2",
      skippedBuiltinViews: [],
    });

    await command.run({ values: { yes: true } } as never);

    expect(pushView).toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("surfaces snapshot drift (ConfigDrift) without re-wrapping as TOCTOU", async () => {
    const drift = new ConflictError(
      ConflictErrorCode.ConfigDrift,
      "drift message",
    );
    vi.mocked(pushView).mockRejectedValue(drift);

    await command.run({ values: { yes: true } } as never);

    expect(handleCliError).toHaveBeenCalledWith(drift);
    expect(mockDeploy).not.toHaveBeenCalled();
  });

  it("re-wraps an API optimistic-lock conflict as a TOCTOU conflict", async () => {
    vi.mocked(pushView).mockRejectedValue(
      new ConflictError(ConflictErrorCode.Conflict, "409"),
    );

    await command.run({ values: { yes: true } } as never);

    const passed = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect(isConflictError(passed)).toBe(true);
    expect((passed as ConflictError).message).toContain("view pull");
    expect(mockDeploy).not.toHaveBeenCalled();
  });
});
