import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
  },
  note: vi.fn(),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
}));

vi.mock("../../handleError", () => ({
  handleCliError: vi.fn(),
}));

vi.mock("../../projectConfig", () => ({
  routeMultiApp: vi.fn(
    async (
      _values: unknown,
      handlers: { singleLegacy: () => Promise<void> },
    ) => {
      await handlers.singleLegacy();
    },
  ),
  runMultiAppWithFailCheck: vi.fn(),
  runMultiAppWithHeaders: vi.fn(),
}));

vi.mock("../../output", () => ({
  printAppHeader: vi.fn(),
}));

import * as p from "@clack/prompts";
import { createCaptureCommand } from "../captureCommandFactory";

afterEach(() => {
  vi.clearAllMocks();
});

function makeConfig() {
  return {
    description: "Test capture",
    args: {} as Record<string, never>,
    deprecation: { commandName: "test capture", replacement: "test pull" },
    spinnerMessage: "Capturing...",
    spinnerStopMessage: "Captured.",
    domainLabel: "Test",
    multiAppSuccessMessage: "All captures completed.",
    createContainer: vi.fn(() => ({})),
    captureFn: vi
      .fn()
      .mockResolvedValue({ configText: "x", hasExistingConfig: false }),
    saveFn: vi.fn().mockResolvedValue(undefined),
    getConfigFilePath: vi.fn(() => "out.yaml"),
    resolveContainerConfig: vi.fn(() => "test-config"),
    resolveAppContainerConfig: vi.fn(() => "app-config"),
  };
}

describe("createCaptureCommand", () => {
  it("should print a deprecation warning pointing to the replacement", async () => {
    const config = makeConfig();
    const command = createCaptureCommand(config);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("test pull"),
    );
    // Existing behavior still runs after the warning.
    expect(config.captureFn).toHaveBeenCalled();
    expect(config.saveFn).toHaveBeenCalled();
  });
});
