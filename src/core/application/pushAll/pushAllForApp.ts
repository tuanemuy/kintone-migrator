import { pushAction } from "@/core/application/action/pushAction";
import { pushAdminNotes } from "@/core/application/adminNotes/pushAdminNotes";
import { pushAppPermission } from "@/core/application/appPermission/pushAppPermission";
import { saveAppRevision } from "@/core/application/appRevisionIo";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import { pushCustomization } from "@/core/application/customization/pushCustomization";
import {
  ConflictErrorCode,
  isConflictError,
  isFatalError,
  SystemError,
  SystemErrorCode,
} from "@/core/application/error";
import { pushFieldPermission } from "@/core/application/fieldPermission/pushFieldPermission";
import { deployApp } from "@/core/application/formSchema/deployApp";
import { pushSchema } from "@/core/application/formSchema/pushSchema";
import { pushGeneralSettings } from "@/core/application/generalSettings/pushGeneralSettings";
import { pushNotification } from "@/core/application/notification/pushNotification";
import { pushPlugin } from "@/core/application/plugin/pushPlugin";
import { pushProcessManagement } from "@/core/application/processManagement/pushProcessManagement";
import { pushRecordPermission } from "@/core/application/recordPermission/pushRecordPermission";
import { pushReport } from "@/core/application/report/pushReport";
import { getCurrentRemoteRevision } from "@/core/application/threeWay/remoteRevision";
import { pushView } from "@/core/application/view/pushView";

/**
 * `push --all` aggregation for a single app (ステップ 13 / AC-14).
 *
 * Mirrors {@link import("../applyAll/applyAllForApp").applyAllForApp}'s phased
 * structure and per-app dependency-ordered deploy, but swaps each `apply<Domain>`
 * for the drift-guarded `push<Domain>` usecase. Seed is excluded (3-way push does
 * not cover record data).
 *
 * Conflict handling in `--all` (ADR-188-005): snapshot drift (a push rejected
 * with `ConfigDrift`) is treated as a non-fatal, skippable outcome — the domain
 * is recorded as `skipped: "drift"` and the remaining domains continue. Use the
 * individual `<domain> pull` then `<domain> push` to resolve a drifted domain.
 */

export type PushDomain =
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

export type PushPhaseName =
  | "Schema"
  | "Views & Customization"
  | "Permissions"
  | "Settings & Others";

export type PushTaskResult =
  | Readonly<{ domain: PushDomain; success: true }>
  | Readonly<{ domain: PushDomain; success: false; skipped: "not-found" }>
  | Readonly<{
      domain: PushDomain;
      success: false;
      error: Error;
      skipped: "drift";
    }>
  | Readonly<{
      domain: PushDomain;
      success: false;
      error: Error;
      skipped: "aborted";
    }>
  | Readonly<{
      domain: PushDomain;
      success: false;
      error: Error;
      skipped: false;
    }>;

export type PushPhaseResult = Readonly<{
  phase: PushPhaseName;
  results: readonly PushTaskResult[];
}>;

export type PushAllForAppOutput = Readonly<{
  phases: readonly PushPhaseResult[];
  deployed: boolean;
  deployError?: Error;
}>;

export type PushAllForAppInput = Readonly<{
  containers: ApplyAllContainers;
  customizeBasePath: string;
  force: boolean;
}>;

type PushTask = {
  readonly domain: PushDomain;
  readonly storageExists: () => Promise<boolean>;
  readonly run: () => Promise<void>;
};

type PhaseDefinition = {
  readonly name: PushPhaseName;
  readonly tasks: readonly PushTask[];
};

function buildPhases(args: PushAllForAppInput): readonly PhaseDefinition[] {
  const c = args.containers;
  const force = args.force;

  return [
    {
      name: "Schema",
      tasks: [
        {
          domain: "schema",
          storageExists: async () =>
            (await c.schema.schemaStorage.get()).exists,
          run: async () => {
            await pushSchema({ container: c.schema, input: { force } });
          },
        },
      ],
    },
    {
      name: "Views & Customization",
      tasks: [
        {
          domain: "customize",
          storageExists: async () =>
            (await c.customization.customizationStorage.get()).exists,
          run: async () => {
            await pushCustomization({
              container: c.customization,
              input: { basePath: args.customizeBasePath, force },
            });
          },
        },
        {
          domain: "view",
          storageExists: async () => (await c.view.viewStorage.get()).exists,
          run: async () => {
            await pushView({ container: c.view, input: { force } });
          },
        },
      ],
    },
    {
      name: "Permissions",
      tasks: [
        {
          domain: "field-acl",
          storageExists: async () =>
            (await c.fieldPermission.fieldPermissionStorage.get()).exists,
          run: async () => {
            await pushFieldPermission({
              container: c.fieldPermission,
              input: { force },
            });
          },
        },
        {
          domain: "app-acl",
          storageExists: async () =>
            (await c.appPermission.appPermissionStorage.get()).exists,
          run: async () => {
            await pushAppPermission({
              container: c.appPermission,
              input: { force },
            });
          },
        },
        {
          domain: "record-acl",
          storageExists: async () =>
            (await c.recordPermission.recordPermissionStorage.get()).exists,
          run: async () => {
            await pushRecordPermission({
              container: c.recordPermission,
              input: { force },
            });
          },
        },
      ],
    },
    {
      name: "Settings & Others",
      tasks: [
        {
          domain: "settings",
          storageExists: async () =>
            (await c.settings.generalSettingsStorage.get()).exists,
          run: async () => {
            await pushGeneralSettings({
              container: c.settings,
              input: { force },
            });
          },
        },
        {
          domain: "notification",
          storageExists: async () =>
            (await c.notification.notificationStorage.get()).exists,
          run: async () => {
            await pushNotification({
              container: c.notification,
              input: { force },
            });
          },
        },
        {
          domain: "report",
          storageExists: async () =>
            (await c.report.reportStorage.get()).exists,
          run: async () => {
            await pushReport({ container: c.report, input: { force } });
          },
        },
        {
          domain: "action",
          storageExists: async () =>
            (await c.action.actionStorage.get()).exists,
          run: async () => {
            await pushAction({ container: c.action, input: { force } });
          },
        },
        {
          domain: "process",
          storageExists: async () =>
            (await c.process.processManagementStorage.get()).exists,
          run: async () => {
            await pushProcessManagement({
              container: c.process,
              input: { force },
            });
          },
        },
        {
          domain: "admin-notes",
          storageExists: async () =>
            (await c.adminNotes.adminNotesStorage.get()).exists,
          run: async () => {
            await pushAdminNotes({ container: c.adminNotes, input: { force } });
          },
        },
        {
          domain: "plugin",
          storageExists: async () =>
            (await c.plugin.pluginStorage.get()).exists,
          run: async () => {
            await pushPlugin({ container: c.plugin, input: { force } });
          },
        },
      ],
    },
  ];
}

type AbortState = {
  aborted: boolean;
  reason: unknown;
  phaseName: PushPhaseName | undefined;
};

function createSkipError(state: AbortState): SystemError {
  return new SystemError(
    SystemErrorCode.InternalServerError,
    `Skipped due to fatal error in phase "${state.phaseName}"`,
    state.reason,
  );
}

function buildSkippedPhaseResult(
  phase: PhaseDefinition,
  state: AbortState,
): PushPhaseResult {
  const skipError = createSkipError(state);
  return {
    phase: phase.name,
    results: phase.tasks.map((task) => ({
      domain: task.domain,
      success: false as const,
      error: skipError,
      skipped: "aborted" as const,
    })),
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

// Snapshot drift (a push rejected because the remote changed since the base)
// surfaces as a ConflictError tagged with ConfigDrift. In `--all` we treat it as
// a skippable, non-fatal outcome so other domains still push (ADR-188-005).
function isDrift(error: Error): boolean {
  return isConflictError(error) && error.code === ConflictErrorCode.ConfigDrift;
}

// Schema phase always has exactly one task (pushSchema). Deploy runs after the
// task so schema changes are deployed before subsequent phases depend on them.
async function executeSchemaPhase(
  phase: PhaseDefinition,
  containers: ApplyAllContainers,
  state: AbortState,
): Promise<PushPhaseResult> {
  const results: PushTaskResult[] = [];
  for (const task of phase.tasks) {
    if (!(await task.storageExists())) {
      results.push({
        domain: task.domain,
        success: false,
        skipped: "not-found",
      });
      continue;
    }

    try {
      await task.run();
      await deployApp({ container: containers.schema });
      results.push({ domain: task.domain, success: true });
    } catch (error) {
      const err = toError(error);
      // A drifted schema is skippable but still aborts the rest: subsequent
      // phases may depend on schema changes that were NOT pushed.
      if (isDrift(err)) {
        results.push({
          domain: task.domain,
          success: false,
          error: err,
          skipped: "drift",
        });
      } else {
        results.push({
          domain: task.domain,
          success: false,
          error: err,
          skipped: false,
        });
      }
      // Schema phase failure (drift or otherwise) aborts subsequent phases:
      // without the intended schema, later domains cannot push consistently.
      state.aborted = true;
      state.reason = err;
      state.phaseName = phase.name;
    }
  }
  return { phase: phase.name, results };
}

async function executeStandardPhase(
  phase: PhaseDefinition,
  state: AbortState,
): Promise<PushPhaseResult> {
  const results: PushTaskResult[] = [];
  for (const task of phase.tasks) {
    if (state.aborted) {
      results.push({
        domain: task.domain,
        success: false,
        error: createSkipError(state),
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
      await task.run();
      results.push({ domain: task.domain, success: true });
    } catch (error) {
      const err = toError(error);
      if (isDrift(err)) {
        // Skippable: drift on one domain does not block the others.
        results.push({
          domain: task.domain,
          success: false,
          error: err,
          skipped: "drift",
        });
        continue;
      }
      results.push({
        domain: task.domain,
        success: false,
        error: err,
        skipped: false,
      });
      if (isFatalError(err)) {
        state.aborted = true;
        state.reason = err;
        state.phaseName = phase.name;
      }
    }
  }
  return { phase: phase.name, results };
}

async function tryDeploy(
  containers: ApplyAllContainers,
): Promise<{ deployed: boolean; error?: Error }> {
  try {
    await deployApp({ container: containers.schema });
    return { deployed: true };
  } catch (error) {
    return { deployed: false, error: toError(error) };
  }
}

/**
 * Push all domains for a single app in phased, dependency-ordered fashion
 * (AC-14). Schema is pushed + deployed first; phases 2-4 push to preview and a
 * single deploy follows. Drift on any domain is recorded as `skipped: "drift"`
 * and does not block other domains (except schema drift, which aborts since
 * later phases depend on the schema). Fatal errors (auth/network) abort the rest.
 */
export async function pushAllForApp(
  args: PushAllForAppInput,
): Promise<PushAllForAppOutput> {
  const phases = buildPhases(args);
  const phaseResults: PushPhaseResult[] = [];
  const state: AbortState = {
    aborted: false,
    reason: undefined,
    phaseName: undefined,
  };

  for (const phase of phases) {
    if (state.aborted) {
      phaseResults.push(buildSkippedPhaseResult(phase, state));
      continue;
    }

    if (phase.name === "Schema") {
      phaseResults.push(
        await executeSchemaPhase(phase, args.containers, state),
      );
    } else {
      phaseResults.push(await executeStandardPhase(phase, state));
    }
  }

  // Deploy after phases 2-4 complete. Deploy even if some domains drifted/failed
  // — successfully pushed changes should still be deployed.
  const needsDeploy = phaseResults.some(
    (pr) => pr.phase !== "Schema" && pr.results.some((r) => r.success),
  );

  const deployResult = needsDeploy
    ? await tryDeploy(args.containers)
    : { deployed: false };

  // Re-sync the shared base app revision to the actual post-deploy remote
  // revision (W-app-001). Each push<Domain> saved its own `update*` response
  // revision, but deploy (schema phase and/or the final deploy) advances the
  // app revision further, so those per-domain bases are stale the moment a
  // deploy runs. Without this re-sync the next `pull --all` early-skip (AC-13)
  // would always miss (base != remote) and fall through to a full 3-way for
  // every domain. We re-read once after all deploys so the saved base matches
  // the revision the early-skip later reads. Skipped on failure so a partially
  // failed run does not record a base the snapshots do not match.
  const anyPushed = phaseResults.some((pr) =>
    pr.results.some((r) => r.success),
  );
  if (anyPushed) {
    await resyncBaseRevision(args.containers);
  }

  return {
    phases: phaseResults,
    deployed: deployResult.deployed,
    deployError: deployResult.error,
  };
}

/**
 * Re-reads the current remote (preview) revision and saves it as the shared base
 * app revision, so the next `pull --all` early-skip (AC-13) can engage after a
 * push that deployed. The app revision is shared across domains (ADR-188-001);
 * the view container exposes the reader + storage + codec used for it, mirroring
 * `pullAllForApp`'s revision path.
 */
async function resyncBaseRevision(
  containers: ApplyAllContainers,
): Promise<void> {
  const revision = await getCurrentRemoteRevision(containers.view);
  await saveAppRevision(
    containers.view.appRevisionStorage,
    containers.view.configCodec,
    revision,
  );
}
