import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  confirm: vi.fn(() => true),
  select: vi.fn(() => "remote"),
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

vi.mock("@/core/application/container/viewCli", () => ({
  createViewCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/view/pullView");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import {
  applyPulledViewMerge,
  pullView,
} from "@/core/application/view/pullView";
import command from "../pull";

afterEach(() => {
  vi.clearAllMocks();
});

const mergedResult = (hasConflict: boolean, conflictKeys: string[] = []) =>
  ({
    mode: "merged" as const,
    merge: {
      hasConflict,
      conflicts: conflictKeys.map((key) => ({ key })),
    },
    remoteConfig: { views: {} },
    remoteRevision: "2",
  }) as never;

describe("view pull command", () => {
  it("applies a conflict-free merge without prompting", async () => {
    vi.mocked(pullView).mockResolvedValue(mergedResult(false));

    await command.run({ values: {} } as never);

    expect(applyPulledViewMerge).toHaveBeenCalled();
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("resolves conflicts via --theirs and applies", async () => {
    vi.mocked(pullView).mockResolvedValue(mergedResult(true, ["一覧"]));

    await command.run({ values: { theirs: true } } as never);

    expect(applyPulledViewMerge).toHaveBeenCalled();
    const input = vi.mocked(applyPulledViewMerge).mock.calls[0]?.[0]?.input;
    expect(input?.resolution.get("一覧")).toBe("remote");
  });

  it("does not write on force mode", async () => {
    vi.mocked(pullView).mockResolvedValue({ mode: "force" } as never);

    await command.run({ values: { force: true } } as never);

    expect(applyPulledViewMerge).not.toHaveBeenCalled();
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("errors when --ours and --theirs are combined", async () => {
    await command.run({ values: { ours: true, theirs: true } } as never);

    expect(handleCliError).toHaveBeenCalled();
    expect(pullView).not.toHaveBeenCalled();
  });
});
