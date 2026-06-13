import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import {
  type PullAllForAppInput,
  type PullDomain,
  pullAllForApp,
} from "../pullAllForApp";

vi.mock("@/core/application/threeWay/remoteRevision");
vi.mock("@/core/application/appRevisionIo");
vi.mock("@/core/application/formSchema/pullSchema");
vi.mock("@/core/application/customization/pullCustomization");
vi.mock("@/core/application/view/pullView");
vi.mock("@/core/application/fieldPermission/pullFieldPermission");
vi.mock("@/core/application/appPermission/pullAppPermission");
vi.mock("@/core/application/recordPermission/pullRecordPermission");
vi.mock("@/core/application/generalSettings/pullGeneralSettings");
vi.mock("@/core/application/notification/pullNotification");
vi.mock("@/core/application/report/pullReport");
vi.mock("@/core/application/action/pullAction");
vi.mock("@/core/application/processManagement/pullProcessManagement");
vi.mock("@/core/application/adminNotes/pullAdminNotes");
vi.mock("@/core/application/plugin/pullPlugin");

import { pullAction } from "@/core/application/action/pullAction";
import { pullAdminNotes } from "@/core/application/adminNotes/pullAdminNotes";
import { pullAppPermission } from "@/core/application/appPermission/pullAppPermission";
import { loadAppRevision } from "@/core/application/appRevisionIo";
import { pullCustomization } from "@/core/application/customization/pullCustomization";
import { pullFieldPermission } from "@/core/application/fieldPermission/pullFieldPermission";
import { pullSchema } from "@/core/application/formSchema/pullSchema";
import { pullGeneralSettings } from "@/core/application/generalSettings/pullGeneralSettings";
import { pullNotification } from "@/core/application/notification/pullNotification";
import { pullPlugin } from "@/core/application/plugin/pullPlugin";
import { pullProcessManagement } from "@/core/application/processManagement/pullProcessManagement";
import { pullRecordPermission } from "@/core/application/recordPermission/pullRecordPermission";
import { pullReport } from "@/core/application/report/pullReport";
import { getCurrentRemoteRevision } from "@/core/application/threeWay/remoteRevision";
import {
  applyPulledViewMerge,
  pullView,
} from "@/core/application/view/pullView";

const storageProbeMap: Record<
  PullDomain,
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

function makeContainers(
  missing: ReadonlySet<PullDomain> = new Set(),
): ApplyAllContainers {
  const containers = {} as Record<string, Record<string, unknown>>;
  for (const domain of Object.keys(storageProbeMap) as PullDomain[]) {
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
  // The view container also exposes the shared revision storage/codec/reader.
  containers.view = {
    ...(containers.view ?? {}),
    appRevisionStorage: {},
    appRevisionReader: {},
    configCodec: {},
  };
  return containers as unknown as ApplyAllContainers;
}

function makeArgs(opts?: {
  missing?: ReadonlySet<PullDomain>;
  ours?: boolean;
  theirs?: boolean;
}): PullAllForAppInput {
  return {
    containers: makeContainers(opts?.missing),
    customizeBasePath: "apps/test-app/customize",
    customizeCaptureBasePath: "apps/test-app",
    customizeFilePrefix: "",
    ours: opts?.ours,
    theirs: opts?.theirs,
  };
}

/** Makes every domain's pull return force (no merge needed) by default. */
function mockAllPullsForce(): void {
  const force = { mode: "force", configText: "" } as never;
  vi.mocked(pullSchema).mockResolvedValue(force);
  vi.mocked(pullView).mockResolvedValue(force);
  vi.mocked(pullFieldPermission).mockResolvedValue(force);
  vi.mocked(pullAppPermission).mockResolvedValue(force);
  vi.mocked(pullRecordPermission).mockResolvedValue(force);
  vi.mocked(pullGeneralSettings).mockResolvedValue(force);
  vi.mocked(pullNotification).mockResolvedValue(force);
  vi.mocked(pullReport).mockResolvedValue(force);
  vi.mocked(pullAction).mockResolvedValue(force);
  vi.mocked(pullProcessManagement).mockResolvedValue(force);
  vi.mocked(pullAdminNotes).mockResolvedValue(force);
  vi.mocked(pullPlugin).mockResolvedValue(force);
  vi.mocked(pullCustomization).mockResolvedValue({ mode: "force" } as never);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("pullAllForApp — revision 早期スキップ（AC-13）", () => {
  it("remote revision が base と一致したら全ドメインをスキップする", async () => {
    vi.mocked(getCurrentRemoteRevision).mockResolvedValue("100");
    vi.mocked(loadAppRevision).mockResolvedValue({ revision: "100" });

    const output = await pullAllForApp(makeArgs());

    expect(output.revisionSkip).toBe(true);
    expect(output.results).toHaveLength(0);
    // No per-domain pull was performed (snapshot comparison skipped).
    expect(pullView).not.toHaveBeenCalled();
    expect(pullSchema).not.toHaveBeenCalled();
  });

  it("remote revision が base と不一致なら各ドメインを 3-way 比較する（誤スキップ防止）", async () => {
    vi.mocked(getCurrentRemoteRevision).mockResolvedValue("101");
    vi.mocked(loadAppRevision).mockResolvedValue({ revision: "100" });
    mockAllPullsForce();

    const output = await pullAllForApp(makeArgs());

    expect(output.revisionSkip).toBe(false);
    expect(pullView).toHaveBeenCalled();
    expect(pullSchema).toHaveBeenCalled();
    expect(output.results).toHaveLength(13);
  });

  it("base revision が無い（初回）ときはスキップせず全比較する", async () => {
    vi.mocked(getCurrentRemoteRevision).mockResolvedValue("100");
    vi.mocked(loadAppRevision).mockResolvedValue(undefined);
    mockAllPullsForce();

    const output = await pullAllForApp(makeArgs());

    expect(output.revisionSkip).toBe(false);
    expect(pullView).toHaveBeenCalled();
  });
});

describe("pullAllForApp — conflict 時挙動（ADR-188-005）", () => {
  it("conflict のドメインは未適用で skipped:conflict、他は続行する", async () => {
    vi.mocked(getCurrentRemoteRevision).mockResolvedValue("101");
    vi.mocked(loadAppRevision).mockResolvedValue({ revision: "100" });
    mockAllPullsForce();
    // view returns a merged result with a conflict.
    vi.mocked(pullView).mockResolvedValue({
      mode: "merged",
      merge: { hasConflict: true, conflicts: [{ key: "v1" }] },
      remoteConfig: {},
      remoteRevision: "101",
    } as never);

    const output = await pullAllForApp(makeArgs());

    const view = output.results.find((r) => r.domain === "view");
    expect(view).toMatchObject({ success: false, skipped: "conflict" });
    // Conflict domain is NOT written (applyPulledViewMerge not called).
    expect(applyPulledViewMerge).not.toHaveBeenCalled();
    // Other domains still ran.
    const report = output.results.find((r) => r.domain === "report");
    expect(report?.success).toBe(true);
  });

  it("--ours 指定時は conflict を local 解決して適用する", async () => {
    vi.mocked(getCurrentRemoteRevision).mockResolvedValue("101");
    vi.mocked(loadAppRevision).mockResolvedValue({ revision: "100" });
    mockAllPullsForce();
    vi.mocked(pullView).mockResolvedValue({
      mode: "merged",
      merge: { hasConflict: true, conflicts: [{ key: "v1" }] },
      remoteConfig: {},
      remoteRevision: "101",
    } as never);
    vi.mocked(applyPulledViewMerge).mockResolvedValue({ configText: "" });

    const output = await pullAllForApp(makeArgs({ ours: true }));

    const view = output.results.find((r) => r.domain === "view");
    expect(view).toMatchObject({ success: true });
    expect(applyPulledViewMerge).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          resolution: new Map([["v1", "local"]]),
        }),
      }),
    );
  });
});
