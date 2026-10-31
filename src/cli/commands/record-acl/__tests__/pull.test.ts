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

vi.mock("@/cli/recordAclConfig", () => ({
  recordAclArgs: {},
  resolveRecordAclContainerConfig: vi.fn(() => ({})),
  resolveRecordAclAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/recordPermissionCli", () => ({
  createRecordPermissionCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/recordPermission/pullRecordPermission");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import {
  applyPulledRecordPermissionMerge,
  pullRecordPermission,
} from "@/core/application/recordPermission/pullRecordPermission";
import command from "../pull";

afterEach(() => {
  vi.clearAllMocks();
});

const mergedWithConflict = (key: string) =>
  ({
    mode: "merged" as const,
    merge: { hasConflict: true, conflicts: [{ key }] },
    remoteConfig: { rights: [] },
    remoteRevision: "2",
  }) as never;

describe("record-acl pull command", () => {
  it("names a conflict as in the 3-way diff line and resolves it by the merge key", async () => {
    vi.mocked(pullRecordPermission).mockResolvedValue(
      mergedWithConflict("a ]: b\nc#0"),
    );

    await command.run({ values: {} } as never);

    expect(p.select).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Conflict on record permission ["a ]: b\\nc"#0]. Keep which side?',
      }),
    );
    const input = vi.mocked(applyPulledRecordPermissionMerge).mock.calls[0]?.[0]
      ?.input;
    expect(input?.resolution).toEqual(new Map([["a ]: b\nc#0", "remote"]]));
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("resolves a conflict by the merge key with --ours", async () => {
    vi.mocked(pullRecordPermission).mockResolvedValue(mergedWithConflict("#0"));

    await command.run({ values: { ours: true } } as never);

    expect(p.select).not.toHaveBeenCalled();
    const input = vi.mocked(applyPulledRecordPermissionMerge).mock.calls[0]?.[0]
      ?.input;
    expect(input?.resolution).toEqual(new Map([["#0", "local"]]));
  });
});
