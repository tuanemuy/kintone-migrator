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

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("@/core/application/container/viewCli", () => ({
  createViewCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/view/captureView");
vi.mock("@/core/application/view/saveView");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureView } from "@/core/application/view/captureView";
import { saveView } from "@/core/application/view/saveView";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("view capture command", () => {
  it("should capture views and save to file", async () => {
    vi.mocked(captureView).mockResolvedValue({
      configText: "views:\n  test:\n    type: LIST\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveView).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureView).toHaveBeenCalled();
    expect(saveView).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "views:\n  test:\n    type: LIST\n" },
      }),
    );
  });

  it("should show file path in success message", async () => {
    vi.mocked(captureView).mockResolvedValue({
      configText: "views:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveView).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("views.yaml"),
    );
  });

  it("should show overwrite warning when existing config exists", async () => {
    vi.mocked(captureView).mockResolvedValue({
      configText: "views:\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveView).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("should not show overwrite warning when no existing config", async () => {
    vi.mocked(captureView).mockResolvedValue({
      configText: "views:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveView).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("should handle errors with handleCliError", async () => {
    const error = new Error("API error");
    vi.mocked(captureView).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveView).not.toHaveBeenCalled();
  });
});
