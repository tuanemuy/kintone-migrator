import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  select: vi.fn(() => "remote"),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  note: vi.fn(),
}));

vi.mock("@/cli/notificationConfig", () => ({
  notificationArgs: {},
  resolveNotificationContainerConfig: vi.fn(() => ({})),
  resolveNotificationAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/notificationCli", () => ({
  createNotificationCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/notification/pullNotification");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import {
  applyPulledNotificationMerge,
  pullNotification,
} from "@/core/application/notification/pullNotification";
import command from "../pull";

afterEach(() => {
  vi.clearAllMocks();
});

const mergedWithConflicts = (keys: string[]) =>
  ({
    mode: "merged" as const,
    merge: {
      hasConflict: true,
      conflicts: keys.map((key) => ({ key })),
    },
    remoteConfig: {},
    remoteRevision: "2",
  }) as never;

describe("notification pull command", () => {
  it("names each conflict as in the 3-way diff line and resolves it by the merge key", async () => {
    vi.mocked(pullNotification).mockResolvedValue(
      mergedWithConflicts(["perRecord:a ]: b\nc#0", "general:USER:u1"]),
    );

    await command.run({ values: {} } as never);

    expect(
      vi.mocked(p.select).mock.calls.map(([opts]) => opts.message),
    ).toEqual([
      'Conflict on notification [perRecord:"a ]: b\\nc"#0]. Keep which side?',
      "Conflict on notification [general:USER:u1]. Keep which side?",
    ]);
    const input = vi.mocked(applyPulledNotificationMerge).mock.calls[0]?.[0]
      ?.input;
    expect(input?.resolution).toEqual(
      new Map([
        ["perRecord:a ]: b\nc#0", "remote"],
        ["general:USER:u1", "remote"],
      ]),
    );
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("names reminder and scalar conflicts in the same bracket form", async () => {
    vi.mocked(pullNotification).mockResolvedValue(
      mergedWithConflicts([
        "reminder:r1",
        "general:notifyToCommenter",
        "reminder:timezone",
      ]),
    );

    await command.run({ values: {} } as never);

    expect(
      vi.mocked(p.select).mock.calls.map(([opts]) => opts.message),
    ).toEqual([
      "Conflict on notification [reminder:r1]. Keep which side?",
      "Conflict on notification [general:notifyToCommenter]. Keep which side?",
      "Conflict on notification [reminder:timezone]. Keep which side?",
    ]);
  });

  it.each([
    ["ours", "local"],
    ["theirs", "remote"],
  ] as const)("resolves every conflict by the merge key with --%s", async (flag, side) => {
    vi.mocked(pullNotification).mockResolvedValue(
      mergedWithConflicts(["perRecord:a ]: b\nc#0", "reminder:r1"]),
    );

    await command.run({ values: { [flag]: true } } as never);

    expect(p.select).not.toHaveBeenCalled();
    const input = vi.mocked(applyPulledNotificationMerge).mock.calls[0]?.[0]
      ?.input;
    expect(input?.resolution).toEqual(
      new Map([
        ["perRecord:a ]: b\nc#0", side],
        ["reminder:r1", side],
      ]),
    );
  });
});
