import {
  applyPulledActionMerge,
  pullAction,
} from "@/core/application/action/pullAction";
import {
  applyPulledAdminNotesMerge,
  pullAdminNotes,
} from "@/core/application/adminNotes/pullAdminNotes";
import {
  applyPulledAppPermissionMerge,
  pullAppPermission,
} from "@/core/application/appPermission/pullAppPermission";
import { loadAppRevision } from "@/core/application/appRevisionIo";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import {
  applyPulledCustomizationMerge,
  pullCustomization,
} from "@/core/application/customization/pullCustomization";
import {
  isFatalError,
  SystemError,
  SystemErrorCode,
} from "@/core/application/error";
import {
  applyPulledFieldPermissionMerge,
  pullFieldPermission,
} from "@/core/application/fieldPermission/pullFieldPermission";
import {
  applyPulledMerge,
  pullSchema,
} from "@/core/application/formSchema/pullSchema";
import {
  applyPulledGeneralSettingsMerge,
  pullGeneralSettings,
} from "@/core/application/generalSettings/pullGeneralSettings";
import {
  applyPulledNotificationMerge,
  pullNotification,
} from "@/core/application/notification/pullNotification";
import {
  applyPulledPluginMerge,
  pullPlugin,
} from "@/core/application/plugin/pullPlugin";
import {
  applyPulledProcessManagementMerge,
  pullProcessManagement,
} from "@/core/application/processManagement/pullProcessManagement";
import {
  applyPulledRecordPermissionMerge,
  pullRecordPermission,
} from "@/core/application/recordPermission/pullRecordPermission";
import {
  applyPulledReportMerge,
  pullReport,
} from "@/core/application/report/pullReport";
import { getCurrentRemoteRevision } from "@/core/application/threeWay/remoteRevision";
import {
  applyPulledViewMerge,
  pullView,
} from "@/core/application/view/pullView";

/**
 * `pull --all` aggregation for a single app (ステップ 13 / AC-13).
 *
 * Reuses the per-app phased structure of `applyAllForApp` but runs each domain's
 * 3-way `pull<Domain>` usecase (read-only against kintone; writes only to local
 * files + base state, no deploy). Two `--all`-specific behaviors:
 *
 * - **revision early-skip (AC-13)**: the remote app (preview) revision is read
 *   once via {@link getCurrentRemoteRevision}. When it equals the locally stored
 *   base appRevision, the remote is unchanged so every per-domain snapshot
 *   comparison is skipped (`revisionSkip: true`). Only on a mismatch (or when no
 *   base revision exists) does each domain run its 3-way comparison. Skipping on
 *   a match never misses drift: an unrelated change advances the app revision, so
 *   a match means no remote change at all (over-detection-safe — ADR-188-005).
 * - **non-interactive conflict handling (ADR-188-005)**: a domain whose merge has
 *   conflicts is left unwritten and recorded as `skipped: "conflict"`; the run
 *   continues. Resolve such domains with the individual `<domain> pull`.
 */

export type PullDomain =
  | "schema"
  | "customize"
  | "view"
  | "field-acl"
  | "app-acl"
  | "record-acl"
  | "settings"
  | "notification"
  | "report"
  | "action"
  | "process"
  | "admin-notes"
  | "plugin";

/** Outcome of a single domain's pull within the `--all` run. */
export type PullTaskResult =
  | Readonly<{
      domain: PullDomain;
      success: true;
      outcome: "merged" | "force" | "firstTime";
    }>
  | Readonly<{ domain: PullDomain; success: false; skipped: "not-found" }>
  | Readonly<{ domain: PullDomain; success: false; skipped: "conflict" }>
  | Readonly<{
      domain: PullDomain;
      success: false;
      error: Error;
      skipped: "aborted";
    }>
  | Readonly<{
      domain: PullDomain;
      success: false;
      error: Error;
      skipped: false;
    }>;

export type PullAllForAppOutput = Readonly<{
  /** True when the remote revision matched the base and all domains were skipped. */
  revisionSkip: boolean;
  results: readonly PullTaskResult[];
}>;

export type PullAllForAppInput = Readonly<{
  containers: ApplyAllContainers;
  /** Base path the customization local resource paths resolve against. */
  customizeBasePath: string;
  /** Base path passed to customization capture (config-file directory). */
  customizeCaptureBasePath: string;
  /** Directory prefix passed to customization capture. */
  customizeFilePrefix: string;
  /** Resolve all conflicts to local instead of skipping (`--ours`). */
  ours?: boolean;
  /** Resolve all conflicts to remote instead of skipping (`--theirs`). */
  theirs?: boolean;
}>;

/** One pulled domain: probes existence, then pulls (+ auto-applies non-conflicts). */
type PullTask = {
  readonly domain: PullDomain;
  readonly storageExists: () => Promise<boolean>;
  /** Returns "merged"/"force"/"firstTime" on apply, or "conflict" when skipped. */
  readonly run: () => Promise<"merged" | "force" | "firstTime" | "conflict">;
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Builds the resolution map for the non-interactive `--all` flow. */
function buildResolution(
  conflicts: readonly { readonly key: string }[],
  ours: boolean,
  theirs: boolean,
): ReadonlyMap<string, "local" | "remote"> {
  const resolution = new Map<string, "local" | "remote">();
  if (!ours && !theirs) {
    return resolution;
  }
  for (const conflict of conflicts) {
    resolution.set(conflict.key, ours ? "local" : "remote");
  }
  return resolution;
}

/**
 * Resolution for single-config (whole-entity) domains: a scalar side, or
 * undefined when not auto-resolving (those paths are skipped before apply).
 */
function singleResolution(
  ours: boolean,
  theirs: boolean,
): "local" | "remote" | undefined {
  if (ours) return "local";
  if (theirs) return "remote";
  return undefined;
}

function buildTasks(args: PullAllForAppInput): readonly PullTask[] {
  const c = args.containers;
  const ours = args.ours === true;
  const theirs = args.theirs === true;
  // Whether a conflicting domain should be auto-resolved (--ours/--theirs) or
  // left for the user (default: skip).
  const autoResolve = ours || theirs;

  return [
    {
      domain: "schema",
      storageExists: async () => (await c.schema.schemaStorage.get()).exists,
      run: async () => {
        const result = await pullSchema({
          container: c.schema,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        // Schema resolution covers both the field channel and the layout channel.
        const fields = new Map(
          result.merge.fieldConflicts.map((conflict) => [
            conflict.key,
            ours ? ("local" as const) : ("remote" as const),
          ]),
        );
        await applyPulledMerge({
          container: c.schema,
          input: {
            merge: result.merge,
            resolution: {
              fields,
              layout: result.merge.layoutConflict
                ? ours
                  ? "local"
                  : "remote"
                : "noConflict",
            },
            remoteRevision: result.remoteRevision,
            remoteSchema: result.remoteSchema,
          },
        });
        return "merged";
      },
    },
    {
      domain: "customize",
      storageExists: async () =>
        (await c.customization.customizationStorage.get()).exists,
      run: async () => {
        const result = await pullCustomization({
          container: c.customization,
          input: {
            basePath: args.customizeBasePath,
            captureBasePath: args.customizeCaptureBasePath,
            filePrefix: args.customizeFilePrefix,
            force: false,
          },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledCustomizationMerge({
          container: c.customization,
          input: {
            basePath: args.customizeBasePath,
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            local: result.local,
            remote: result.remote,
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "view",
      storageExists: async () => (await c.view.viewStorage.get()).exists,
      run: async () => {
        const result = await pullView({
          container: c.view,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledViewMerge({
          container: c.view,
          input: {
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "field-acl",
      storageExists: async () =>
        (await c.fieldPermission.fieldPermissionStorage.get()).exists,
      run: async () => {
        const result = await pullFieldPermission({
          container: c.fieldPermission,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledFieldPermissionMerge({
          container: c.fieldPermission,
          input: {
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "app-acl",
      storageExists: async () =>
        (await c.appPermission.appPermissionStorage.get()).exists,
      run: async () => {
        const result = await pullAppPermission({
          container: c.appPermission,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledAppPermissionMerge({
          container: c.appPermission,
          input: {
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "record-acl",
      storageExists: async () =>
        (await c.recordPermission.recordPermissionStorage.get()).exists,
      run: async () => {
        const result = await pullRecordPermission({
          container: c.recordPermission,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledRecordPermissionMerge({
          container: c.recordPermission,
          input: {
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "settings",
      storageExists: async () =>
        (await c.settings.generalSettingsStorage.get()).exists,
      run: async () => {
        const result = await pullGeneralSettings({
          container: c.settings,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledGeneralSettingsMerge({
          container: c.settings,
          input: {
            merge: result.merge,
            resolution: singleResolution(ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "notification",
      storageExists: async () =>
        (await c.notification.notificationStorage.get()).exists,
      run: async () => {
        const result = await pullNotification({
          container: c.notification,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledNotificationMerge({
          container: c.notification,
          input: {
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "report",
      storageExists: async () => (await c.report.reportStorage.get()).exists,
      run: async () => {
        const result = await pullReport({
          container: c.report,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledReportMerge({
          container: c.report,
          input: {
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "action",
      storageExists: async () => (await c.action.actionStorage.get()).exists,
      run: async () => {
        const result = await pullAction({
          container: c.action,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledActionMerge({
          container: c.action,
          input: {
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "process",
      storageExists: async () =>
        (await c.process.processManagementStorage.get()).exists,
      run: async () => {
        const result = await pullProcessManagement({
          container: c.process,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledProcessManagementMerge({
          container: c.process,
          input: {
            merge: result.merge,
            resolution: singleResolution(ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "admin-notes",
      storageExists: async () =>
        (await c.adminNotes.adminNotesStorage.get()).exists,
      run: async () => {
        const result = await pullAdminNotes({
          container: c.adminNotes,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledAdminNotesMerge({
          container: c.adminNotes,
          input: {
            merge: result.merge,
            resolution: singleResolution(ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
    {
      domain: "plugin",
      storageExists: async () => (await c.plugin.pluginStorage.get()).exists,
      run: async () => {
        const result = await pullPlugin({
          container: c.plugin,
          input: { force: false },
        });
        if (result.mode !== "merged") {
          return result.mode;
        }
        if (result.merge.hasConflict && !autoResolve) {
          return "conflict";
        }
        await applyPulledPluginMerge({
          container: c.plugin,
          input: {
            merge: result.merge,
            resolution: buildResolution(result.merge.conflicts, ours, theirs),
            remoteConfig: result.remoteConfig,
            remoteRevision: result.remoteRevision,
          },
        });
        return "merged";
      },
    },
  ];
}

/**
 * Reads the locally stored base appRevision (shared per app — ADR-188-001).
 * Returns undefined when no base revision exists yet (first run), in which case
 * the early-skip is disabled and every domain runs its 3-way comparison.
 */
async function loadBaseRevision(
  containers: ApplyAllContainers,
): Promise<string | undefined> {
  // The app revision is shared across domains; the view container exposes the
  // storage + codec used to read it.
  const base = await loadAppRevision(
    containers.view.appRevisionStorage,
    containers.view.configCodec,
  );
  return base?.revision;
}

/**
 * Pull all domains for a single app (AC-13). Performs the remote-revision
 * early-skip, then runs each domain's 3-way pull, auto-applying non-conflict
 * merges and skipping conflicting domains (non-interactive). Fatal errors
 * (auth/network) abort the remaining domains.
 */
export async function pullAllForApp(
  args: PullAllForAppInput,
): Promise<PullAllForAppOutput> {
  const containers = args.containers;

  // AC-13 early-skip: read remote (preview) revision once and compare with the
  // stored base. A match means the remote is unchanged, so skip all per-domain
  // comparisons. A mismatch (or absent base) falls through to full 3-way.
  const [remoteRevision, baseRevision] = await Promise.all([
    getCurrentRemoteRevision(containers.view),
    loadBaseRevision(containers),
  ]);

  if (baseRevision !== undefined && baseRevision === remoteRevision) {
    return { revisionSkip: true, results: [] };
  }

  const tasks = buildTasks(args);
  const results: PullTaskResult[] = [];
  let aborted = false;
  let abortReason: unknown;

  for (const task of tasks) {
    if (aborted) {
      results.push({
        domain: task.domain,
        success: false,
        error: new SystemError(
          SystemErrorCode.InternalServerError,
          "Skipped due to fatal error in an earlier domain",
          abortReason,
        ),
        skipped: "aborted",
      });
      continue;
    }

    if (!(await task.storageExists())) {
      results.push({
        domain: task.domain,
        success: false,
        skipped: "not-found",
      });
      continue;
    }

    try {
      const outcome = await task.run();
      if (outcome === "conflict") {
        results.push({
          domain: task.domain,
          success: false,
          skipped: "conflict",
        });
      } else {
        results.push({ domain: task.domain, success: true, outcome });
      }
    } catch (error) {
      const err = toError(error);
      results.push({
        domain: task.domain,
        success: false,
        error: err,
        skipped: false,
      });
      if (isFatalError(err)) {
        aborted = true;
        abortReason = err;
      }
    }
  }

  return { revisionSkip: false, results };
}
