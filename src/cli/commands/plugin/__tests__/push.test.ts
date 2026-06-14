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

vi.mock("@/cli/pluginConfig", () => ({
  pluginArgs: {},
  resolvePluginContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    pluginFilePath: "plugins.yaml",
  })),
  resolvePluginAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/pluginCli", () => ({
  createPluginCliContainer: vi.fn(() => ({
    appDeployer: { deploy: mockDeploy },
  })),
}));

vi.mock("@/core/application/plugin/pushPlugin");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { pushPlugin } from "@/core/application/plugin/pushPlugin";
import command from "../push";

afterEach(() => {
  vi.clearAllMocks();
});

describe("plugin push command", () => {
  it("pushes and deploys on success", async () => {
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [],
    });

    await command.run({ values: { yes: true } } as never);

    expect(pushPlugin).toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("warns about add-disabled skips with force-enable / kintone admin UI wording", async () => {
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [
        {
          pluginId: "abcdefghijklmnopqrstuvwxyz012345",
          reason: "add-disabled",
        },
      ],
    });

    await command.run({ values: { yes: true } } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("force-enable"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("kintone admin UI"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("abcdefghijklmnopqrstuvwxyz012345"),
    );
  });

  it("lists every add-disabled pluginId in the warning", async () => {
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [
        {
          pluginId: "abcdefghijklmnopqrstuvwxyz012345",
          reason: "add-disabled",
        },
        {
          pluginId: "zyxwvutsrqponmlkjihgfedcba543210",
          reason: "add-disabled",
        },
      ],
    });

    await command.run({ values: { yes: true } } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "abcdefghijklmnopqrstuvwxyz012345, zyxwvutsrqponmlkjihgfedcba543210",
      ),
    );
  });

  it("does not emit the add-disabled warning when no add-disabled skips exist", async () => {
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: ["djmhffjlbkikgmepoociabnpfcfjhdge"],
      skipped: [],
    });

    await command.run({ values: { yes: true } } as never);

    expect(p.log.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("force-enable"),
    );
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("djmhffjlbkikgmepoociabnpfcfjhdge"),
    );
  });

  it("preserves the existing delete / modify warnings alongside add-disabled", async () => {
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [
        { pluginId: "deletedplugin0000000000000000000", reason: "delete" },
        { pluginId: "modifiedplugin000000000000000000", reason: "modify" },
        {
          pluginId: "disabledplugin000000000000000000",
          reason: "add-disabled",
        },
      ],
    });

    await command.run({ values: { yes: true } } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("deletedplugin0000000000000000000"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("modifiedplugin000000000000000000"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("disabledplugin000000000000000000"),
    );
  });

  it("handles errors via handleCliError", async () => {
    const error = new Error("Plugin push failed");
    vi.mocked(pushPlugin).mockRejectedValue(error);

    await command.run({ values: { yes: true } } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
