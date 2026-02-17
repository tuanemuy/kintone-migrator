import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
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

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("@/core/application/container/generalSettingsCli", () => ({
  createGeneralSettingsCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/generalSettings/captureGeneralSettings");
vi.mock("@/core/application/generalSettings/saveGeneralSettings");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureGeneralSettings } from "@/core/application/generalSettings/captureGeneralSettings";
import { saveGeneralSettings } from "@/core/application/generalSettings/saveGeneralSettings";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("settings capture command", () => {
  it("should capture and save general settings", async () => {
    vi.mocked(captureGeneralSettings).mockResolvedValue({
      configText: "name: My App\ntheme: BLUE\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveGeneralSettings).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureGeneralSettings).toHaveBeenCalled();
    expect(saveGeneralSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "name: My App\ntheme: BLUE\n" },
      }),
    );
  });

  it("should show success message with file path", async () => {
    vi.mocked(captureGeneralSettings).mockResolvedValue({
      configText: "name: App\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveGeneralSettings).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("settings.yaml"),
    );
  });

  it("should show warning when existing config is overwritten", async () => {
    vi.mocked(captureGeneralSettings).mockResolvedValue({
      configText: "name: App\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveGeneralSettings).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("should not show overwrite warning when no existing config", async () => {
    vi.mocked(captureGeneralSettings).mockResolvedValue({
      configText: "name: App\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveGeneralSettings).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("should handle errors with handleCliError", async () => {
    const error = new Error("API error");
    vi.mocked(captureGeneralSettings).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveGeneralSettings).not.toHaveBeenCalled();
  });
});
