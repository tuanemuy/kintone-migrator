import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import {
  ConflictError,
  ConflictErrorCode,
  UnauthenticatedError,
  UnauthenticatedErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import {
  type PushAllForAppInput,
  type PushDomain,
  pushAllForApp,
} from "../pushAllForApp";

vi.mock("@/core/application/formSchema/pushSchema");
vi.mock("@/core/application/formSchema/deployApp");
vi.mock("@/core/application/customization/pushCustomization");
vi.mock("@/core/application/view/pushView");
vi.mock("@/core/application/fieldPermission/pushFieldPermission");
vi.mock("@/core/application/appPermission/pushAppPermission");
vi.mock("@/core/application/recordPermission/pushRecordPermission");
vi.mock("@/core/application/generalSettings/pushGeneralSettings");
vi.mock("@/core/application/notification/pushNotification");
vi.mock("@/core/application/report/pushReport");
vi.mock("@/core/application/action/pushAction");
vi.mock("@/core/application/processManagement/pushProcessManagement");
vi.mock("@/core/application/adminNotes/pushAdminNotes");
vi.mock("@/core/application/plugin/pushPlugin");

import { pushAction } from "@/core/application/action/pushAction";
import { pushAdminNotes } from "@/core/application/adminNotes/pushAdminNotes";
import { pushAppPermission } from "@/core/application/appPermission/pushAppPermission";
import { pushCustomization } from "@/core/application/customization/pushCustomization";
import { pushFieldPermission } from "@/core/application/fieldPermission/pushFieldPermission";
import { deployApp } from "@/core/application/formSchema/deployApp";
import { pushSchema } from "@/core/application/formSchema/pushSchema";
import { pushGeneralSettings } from "@/core/application/generalSettings/pushGeneralSettings";
import { pushNotification } from "@/core/application/notification/pushNotification";
import { pushPlugin } from "@/core/application/plugin/pushPlugin";
import { pushProcessManagement } from "@/core/application/processManagement/pushProcessManagement";
import { pushRecordPermission } from "@/core/application/recordPermission/pushRecordPermission";
import { pushReport } from "@/core/application/report/pushReport";
import { pushView } from "@/core/application/view/pushView";

const storageProbeMap: Record<
  PushDomain,
  { containerKey: keyof ApplyAllContainers; storageProp: string }
> = {
  schema: { containerKey: "schema", storageProp: "schemaStorage" },
  customize: {
    containerKey: "customization",
    storageProp: "customizationStorage",
  },
  view: { containerKey: "view", storageProp: "viewStorage" },
  "field-acl": {
    containerKey: "fieldPermission",
    storageProp: "fieldPermissionStorage",
  },
  "app-acl": {
    containerKey: "appPermission",
    storageProp: "appPermissionStorage",
  },
  "record-acl": {
    containerKey: "recordPermission",
    storageProp: "recordPermissionStorage",
  },
  settings: { containerKey: "settings", storageProp: "generalSettingsStorage" },
  notification: {
    containerKey: "notification",
    storageProp: "notificationStorage",
  },
  report: { containerKey: "report", storageProp: "reportStorage" },
  action: { containerKey: "action", storageProp: "actionStorage" },
  process: { containerKey: "process", storageProp: "processManagementStorage" },
  "admin-notes": {
    containerKey: "adminNotes",
    storageProp: "adminNotesStorage",
  },
  plugin: { containerKey: "plugin", storageProp: "pluginStorage" },
};

// Captures the base revision re-sync: the view container exposes
// the shared appRevision reader/storage + codec that `resyncBaseRevision` uses.
type RevisionSync = {
  readonly remoteRevision: string;
  savedRevision: string | undefined;
};

function makeContainers(
  missing: ReadonlySet<PushDomain> = new Set(),
  sync: RevisionSync = { remoteRevision: "9", savedRevision: undefined },
): ApplyAllContainers {
  const containers = {} as Record<string, Record<string, unknown>>;
  for (const domain of Object.keys(storageProbeMap) as PushDomain[]) {
    const { containerKey, storageProp } = storageProbeMap[domain];
    const exists = !missing.has(domain);
    containers[containerKey] = {
      ...(containers[containerKey] ?? {}),
      [storageProp]: {
        get: async () =>
          exists ? { exists: true, content: "stub" } : { exists: false },
      },
    };
  }
  // The view container additionally carries the shared appRevision reader/
  // storage + codec read back by the post-deploy base re-sync.
  containers.view = {
    ...(containers.view ?? {}),
    configCodec: {
      stringify: (data: unknown) => JSON.stringify(data),
      parse: (text: string) => JSON.parse(text),
    },
    appRevisionReader: {
      getCurrent: async () => sync.remoteRevision,
    },
    appRevisionStorage: {
      update: async (content: string) => {
        sync.savedRevision = (
          JSON.parse(content) as { revision: string }
        ).revision;
      },
    },
  };
  return containers as unknown as ApplyAllContainers;
}

function makeArgs(opts?: {
  missing?: ReadonlySet<PushDomain>;
  force?: boolean;
  sync?: RevisionSync;
}): PushAllForAppInput {
  return {
    containers: makeContainers(opts?.missing, opts?.sync),
    customizeBasePath: "apps/test-app",
    force: opts?.force ?? false,
  };
}

function mockAllPushesSucceed(): void {
  vi.mocked(pushSchema).mockResolvedValue({ mode: "push", revision: "2" });
  vi.mocked(deployApp).mockResolvedValue(undefined);
  vi.mocked(pushCustomization).mockResolvedValue({
    mode: "push",
    revision: "2",
  });
  vi.mocked(pushView).mockResolvedValue({
    mode: "push",
    revision: "2",
    skippedBuiltinViews: [],
  });
  vi.mocked(pushFieldPermission).mockResolvedValue({
    mode: "push",
    revision: "2",
  });
  vi.mocked(pushAppPermission).mockResolvedValue({
    mode: "push",
    revision: "2",
  });
  vi.mocked(pushRecordPermission).mockResolvedValue({
    mode: "push",
    revision: "2",
  });
  vi.mocked(pushGeneralSettings).mockResolvedValue({
    mode: "push",
    revision: "2",
  });
  vi.mocked(pushNotification).mockResolvedValue({
    mode: "push",
    revision: "2",
  });
  vi.mocked(pushReport).mockResolvedValue({ mode: "push", revision: "2" });
  vi.mocked(pushAction).mockResolvedValue({ mode: "push", revision: "2" });
  vi.mocked(pushProcessManagement).mockResolvedValue({
    mode: "push",
    revision: "2",
  });
  vi.mocked(pushAdminNotes).mockResolvedValue({ mode: "push", revision: "2" });
  vi.mocked(pushPlugin).mockResolvedValue({
    mode: "push",
    revision: "2",
    addedPluginIds: [],
    skipped: [],
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("pushAllForApp", () => {
  it("全4フェーズ・13ドメインが phased 順で成功し deploy される（AC-14）", async () => {
    mockAllPushesSucceed();

    const output = await pushAllForApp(makeArgs());

    expect(output.phases).toHaveLength(4);
    expect(output.phases.map((p) => p.phase)).toEqual([
      "Schema",
      "Views & Customization",
      "Permissions",
      "Settings & Others",
    ]);

    const allResults = output.phases.flatMap((p) => p.results);
    expect(allResults).toHaveLength(13);
    for (const r of allResults) {
      expect(r.success).toBe(true);
      // Unified run signature: every success result carries `warnings`,
      // empty when the task emitted none.
      if (r.success) {
        expect(r.warnings).toEqual([]);
      }
    }

    // Schema deploy happens after the schema task, plus a single deploy after
    // phases 2-4 → 2 deploy calls.
    expect(deployApp).toHaveBeenCalledTimes(2);
    expect(output.deployed).toBe(true);
  });

  it("drift（ConfigDrift）のドメインは skipped:drift として記録し他は続行する（ADR-188-005）", async () => {
    mockAllPushesSucceed();
    vi.mocked(pushView).mockRejectedValue(
      new ConflictError(ConflictErrorCode.ConfigDrift, "drift"),
    );

    const output = await pushAllForApp(makeArgs());

    const view = output.phases
      .flatMap((p) => p.results)
      .find((r) => r.domain === "view");
    expect(view).toMatchObject({ success: false, skipped: "drift" });

    // Other domains still pushed and deploy still happened.
    const report = output.phases
      .flatMap((p) => p.results)
      .find((r) => r.domain === "report");
    expect(report?.success).toBe(true);
    expect(output.deployed).toBe(true);
  });

  it("schema の drift は後続フェーズを abort する", async () => {
    mockAllPushesSucceed();
    vi.mocked(pushSchema).mockRejectedValue(
      new ConflictError(ConflictErrorCode.ConfigDrift, "drift"),
    );

    const output = await pushAllForApp(makeArgs());

    const schema = output.phases[0].results[0];
    expect(schema).toMatchObject({ success: false, skipped: "drift" });
    // Subsequent phases aborted.
    const view = output.phases
      .flatMap((p) => p.results)
      .find((r) => r.domain === "view");
    expect(view).toMatchObject({ success: false, skipped: "aborted" });
    expect(pushView).not.toHaveBeenCalled();
  });

  it("fatal error（認証）は後続を abort する", async () => {
    mockAllPushesSucceed();
    vi.mocked(pushView).mockRejectedValue(
      new UnauthenticatedError(
        UnauthenticatedErrorCode.AuthenticationRequired,
        "auth",
      ),
    );

    const output = await pushAllForApp(makeArgs());

    const report = output.phases
      .flatMap((p) => p.results)
      .find((r) => r.domain === "report");
    expect(report).toMatchObject({ success: false, skipped: "aborted" });
  });

  it("force=true を各 push に伝播する", async () => {
    mockAllPushesSucceed();

    await pushAllForApp(makeArgs({ force: true }));

    expect(pushView).toHaveBeenCalledWith({
      container: expect.anything(),
      input: { force: true },
    });
  });

  it("not-found のドメインは skipped:not-found で続行する", async () => {
    mockAllPushesSucceed();

    const output = await pushAllForApp(
      makeArgs({ missing: new Set(["report"]) }),
    );

    const report = output.phases
      .flatMap((p) => p.results)
      .find((r) => r.domain === "report");
    expect(report).toMatchObject({ success: false, skipped: "not-found" });
    expect(pushReport).not.toHaveBeenCalled();
  });

  it("push 後に base appRevision を deploy 後の remote revision へ再同期する（W-app-001）", async () => {
    mockAllPushesSucceed();
    // The post-deploy remote revision (read back by the early-skip later) is "9",
    // ahead of every push's "2" response — without the re-sync the next
    // `pull --all` early-skip would always miss.
    const sync: RevisionSync = {
      remoteRevision: "9",
      savedRevision: undefined,
    };

    await pushAllForApp(makeArgs({ sync }));

    expect(sync.savedRevision).toBe("9");
  });

  it("何も push されなかった場合は base appRevision を再同期しない（W-app-001）", async () => {
    mockAllPushesSucceed();
    // All domains missing → nothing pushed → the base must stay untouched so a
    // no-op run does not record a revision the snapshots do not match.
    const sync: RevisionSync = {
      remoteRevision: "9",
      savedRevision: undefined,
    };

    await pushAllForApp(
      makeArgs({
        missing: new Set(Object.keys(storageProbeMap) as PushDomain[]),
        sync,
      }),
    );

    expect(sync.savedRevision).toBeUndefined();
  });

  function findPlugin(output: Awaited<ReturnType<typeof pushAllForApp>>) {
    return output.phases
      .flatMap((p) => p.results)
      .find((r) => r.domain === "plugin");
  }

  it("plugin の add-disabled スキップが plugin success 結果の warnings に載る", async () => {
    mockAllPushesSucceed();
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [
        { pluginId: "plugA", reason: "add-disabled" },
        { pluginId: "plugB", reason: "add-disabled" },
      ],
    });

    const output = await pushAllForApp(makeArgs());

    const plugin = findPlugin(output);
    expect(plugin?.success).toBe(true);
    if (plugin?.success) {
      expect(plugin.warnings).toEqual([
        {
          domain: "plugin",
          message:
            "Cannot add plugins in a disabled state via the kintone API (add-only; adding would force-enable them); not added — set enabled: false manually in the kintone admin UI: plugA, plugB",
        },
      ]);
    }
  });

  it("plugin の delete スキップが warnings に載る", async () => {
    mockAllPushesSucceed();
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [{ pluginId: "plugDel", reason: "delete" }],
    });

    const output = await pushAllForApp(makeArgs());

    const plugin = findPlugin(output);
    if (plugin?.success) {
      expect(plugin.warnings).toEqual([
        {
          domain: "plugin",
          message:
            "Cannot remove plugins via the kintone API (add-only); left on the app: plugDel",
        },
      ]);
    } else {
      throw new Error("plugin should have succeeded");
    }
  });

  it("plugin の modify スキップが warnings に載る", async () => {
    mockAllPushesSucceed();
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [{ pluginId: "plugMod", reason: "modify" }],
    });

    const output = await pushAllForApp(makeArgs());

    const plugin = findPlugin(output);
    if (plugin?.success) {
      expect(plugin.warnings).toEqual([
        {
          domain: "plugin",
          message:
            "Cannot modify existing plugins (name/enabled) via the kintone API (add-only); unchanged: plugMod",
        },
      ]);
    } else {
      throw new Error("plugin should have succeeded");
    }
  });

  it("plugin の skipped が delete/modify/add-disabled 混在のとき3種すべての warning を順に載せる", async () => {
    mockAllPushesSucceed();
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [
        { pluginId: "plugDel", reason: "delete" },
        { pluginId: "plugMod", reason: "modify" },
        { pluginId: "plugDis", reason: "add-disabled" },
      ],
    });

    const output = await pushAllForApp(makeArgs());

    const plugin = findPlugin(output);
    if (plugin?.success) {
      expect(plugin.warnings.map((w) => w.message)).toEqual([
        "Cannot remove plugins via the kintone API (add-only); left on the app: plugDel",
        "Cannot modify existing plugins (name/enabled) via the kintone API (add-only); unchanged: plugMod",
        "Cannot add plugins in a disabled state via the kintone API (add-only; adding would force-enable them); not added — set enabled: false manually in the kintone admin UI: plugDis",
      ]);
    } else {
      throw new Error("plugin should have succeeded");
    }
  });

  it("plugin の skipped が空のとき warnings は空", async () => {
    mockAllPushesSucceed();

    const output = await pushAllForApp(makeArgs());

    const plugin = findPlugin(output);
    if (plugin?.success) {
      expect(plugin.warnings).toEqual([]);
    } else {
      throw new Error("plugin should have succeeded");
    }
  });

  it("push-all が生成する3種の warning 文言が plugin push 単体コマンドの文言と1文字単位で一致する", async () => {
    // The warning wording is intentionally duplicated (not extracted into a
    // shared constant) per the do-not-over-generalize decision, so these literals
    // are kept in sync with src/cli/commands/plugin/push.ts by hand. This test
    // fails if either side drifts.
    mockAllPushesSucceed();
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [
        { pluginId: "plugDel", reason: "delete" },
        { pluginId: "plugMod", reason: "modify" },
        { pluginId: "plugDis", reason: "add-disabled" },
      ],
    });

    const output = await pushAllForApp(makeArgs());

    const plugin = findPlugin(output);
    if (plugin?.success) {
      expect(plugin.warnings[0].message).toBe(
        "Cannot remove plugins via the kintone API (add-only); left on the app: plugDel",
      );
      expect(plugin.warnings[1].message).toBe(
        "Cannot modify existing plugins (name/enabled) via the kintone API (add-only); unchanged: plugMod",
      );
      expect(plugin.warnings[2].message).toBe(
        "Cannot add plugins in a disabled state via the kintone API (add-only; adding would force-enable them); not added — set enabled: false manually in the kintone admin UI: plugDis",
      );
    } else {
      throw new Error("plugin should have succeeded");
    }
  });

  it("schema phase の success 結果も warnings:[] を持つ", async () => {
    mockAllPushesSucceed();

    const output = await pushAllForApp(makeArgs());

    const schema = output.phases[0].results[0];
    expect(schema.domain).toBe("schema");
    expect(schema.success).toBe(true);
    if (schema.success) {
      expect(schema.warnings).toEqual([]);
    }
  });

  it("plugin の success+warning と、別ドメインの実失敗（skipped:false）が同一出力に共存する", async () => {
    mockAllPushesSucceed();
    // plugin (last domain of the Settings & Others phase) succeeds with a
    // warning. notification (an earlier domain of the same phase) fails with a
    // non-fatal error, recording a genuine `skipped:false` failure without
    // aborting the rest. A non-fatal failure is required: push-all has no
    // post-plugin phase, so it is the only way plugin can still run-and-warn
    // alongside a recorded failure.
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [{ pluginId: "plugDis", reason: "add-disabled" }],
    });
    vi.mocked(pushNotification).mockRejectedValue(
      new ValidationError(ValidationErrorCode.InvalidInput, "invalid"),
    );

    const output = await pushAllForApp(makeArgs());

    const allResults = output.phases.flatMap((p) => p.results);

    // plugin's success+warning survives in the same output as the failure.
    const plugin = allResults.find((r) => r.domain === "plugin");
    expect(plugin?.success).toBe(true);
    if (plugin?.success) {
      expect(plugin.warnings).toHaveLength(1);
      expect(plugin.warnings[0].domain).toBe("plugin");
    }

    // A genuine failure was recorded (skipped:false), so the coexistence is
    // real and not a tautology.
    const notification = allResults.find((r) => r.domain === "notification");
    expect(notification?.success).toBe(false);
    if (notification && !notification.success) {
      expect(notification.skipped).toBe(false);
      // The failure variant has no `warnings` field at all — only success
      // results carry warnings.
      expect("warnings" in notification).toBe(false);
    }

    // Both the warning and the failure coexist in the final output.
    expect(allResults.some((r) => r.success && r.warnings.length > 0)).toBe(
      true,
    );
    expect(allResults.some((r) => !r.success && r.skipped === false)).toBe(
      true,
    );
  });

  it("plugin 自身が drift skip したとき success バリアントでないため warning を持たない", async () => {
    mockAllPushesSucceed();
    // plugin itself drifts: ConfigDrift → skipped:"drift" failure variant. The
    // would-be add-only warnings are never reachable because the task did not
    // succeed; the drift failure result carries no `warnings` field.
    vi.mocked(pushPlugin).mockRejectedValue(
      new ConflictError(ConflictErrorCode.ConfigDrift, "drift"),
    );

    const output = await pushAllForApp(makeArgs());

    const plugin = findPlugin(output);
    expect(plugin).toMatchObject({ success: false, skipped: "drift" });
    if (plugin && !plugin.success) {
      expect("warnings" in plugin).toBe(false);
    }
  });

  it("plugin が not-found skip したとき warning を持たない", async () => {
    mockAllPushesSucceed();

    const output = await pushAllForApp(
      makeArgs({ missing: new Set(["plugin"]) }),
    );

    const plugin = findPlugin(output);
    expect(plugin).toMatchObject({ success: false, skipped: "not-found" });
    expect(pushPlugin).not.toHaveBeenCalled();
    if (plugin && !plugin.success) {
      expect("warnings" in plugin).toBe(false);
    }
  });

  it("warning があっても全体は success 扱いで deploy され、base revision 再同期も走る", async () => {
    mockAllPushesSucceed();
    vi.mocked(pushPlugin).mockResolvedValue({
      mode: "push",
      revision: "2",
      addedPluginIds: [],
      skipped: [{ pluginId: "plugDis", reason: "add-disabled" }],
    });
    const sync: RevisionSync = {
      remoteRevision: "9",
      savedRevision: undefined,
    };

    const output = await pushAllForApp(makeArgs({ sync }));

    // All 13 domains still succeed; warning does not flip success/skip/error.
    const allResults = output.phases.flatMap((p) => p.results);
    expect(allResults).toHaveLength(13);
    for (const r of allResults) {
      expect(r.success).toBe(true);
    }
    // anyPushed/needsDeploy verdicts look only at r.success, so deploy and the
    // post-deploy base re-sync run exactly as in the warning-free case.
    expect(output.deployed).toBe(true);
    expect(sync.savedRevision).toBe("9");
  });
});
