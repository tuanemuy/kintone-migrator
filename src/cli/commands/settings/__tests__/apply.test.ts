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

vi.mock("@/cli/settingsConfig", () => ({
  settingsArgs: {},
  resolveSettingsContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    settingsFilePath: "settings.yaml",
  })),
  resolveSettingsAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/generalSettingsCli", () => ({
  createGeneralSettingsCliContainer: vi.fn(() => ({
    appDeployer: { deploy: mockDeploy },
  })),
}));

vi.mock("@/core/application/generalSettings/applyGeneralSettings");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { applyGeneralSettings } from "@/core/application/generalSettings/applyGeneralSettings";
import command from "../apply";

afterEach(() => {
  vi.clearAllMocks();
});

describe("settings apply command", () => {
  it("should show success message after applying general settings", async () => {
    vi.mocked(applyGeneralSettings).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(applyGeneralSettings).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("successfully"),
    );
  });

  it("should confirm and deploy after applying", async () => {
    vi.mocked(applyGeneralSettings).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(true);

    await command.run({ values: {} } as never);

    expect(p.confirm).toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
  });

  it("should show warning when deploy is cancelled", async () => {
    vi.mocked(applyGeneralSettings).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(mockDeploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("should skip confirmation with --yes flag", async () => {
    vi.mocked(applyGeneralSettings).mockResolvedValue(undefined);

    await command.run({ values: { yes: true } } as never);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
  });

  it("should handle errors with handleCliError", async () => {
    const error = new Error("Settings apply failed");
    vi.mocked(applyGeneralSettings).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
