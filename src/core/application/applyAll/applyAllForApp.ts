import { applyAction } from "@/core/application/action/applyAction";
import { applyAdminNotes } from "@/core/application/adminNotes/applyAdminNotes";
import { applyAppPermission } from "@/core/application/appPermission/applyAppPermission";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import { applyCustomization } from "@/core/application/customization/applyCustomization";
import {
  isFatalError,
  SystemError,
  SystemErrorCode,
} from "@/core/application/error";
import { applyFieldPermission } from "@/core/application/fieldPermission/applyFieldPermission";
import { deployApp } from "@/core/application/formSchema/deployApp";
import { executeMigration } from "@/core/application/formSchema/executeMigration";
import { applyGeneralSettings } from "@/core/application/generalSettings/applyGeneralSettings";
import { applyNotification } from "@/core/application/notification/applyNotification";
import { applyPlugin } from "@/core/application/plugin/applyPlugin";
import { applyProcessManagement } from "@/core/application/processManagement/applyProcessManagement";
import { applyRecordPermission } from "@/core/application/recordPermission/applyRecordPermission";
import { applyReport } from "@/core/application/report/applyReport";
import { upsertSeed } from "@/core/application/seedData/upsertSeed";
import { applyView } from "@/core/application/view/applyView";

export type ApplyDomain =
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
  | "plugin"
  | "seed";

export type ApplyPhaseName =
  | "Schema"
  | "Views & Customization"
  | "Permissions"
  | "Settings & Others"
  | "Seed Data";

export type ApplyTaskResult =
  | Readonly<{ domain: ApplyDomain; success: true }>
  | Readonly<{
      domain: ApplyDomain;
      success: false;
      error: Error;
      skipped: boolean;
    }>;

export type ApplyPhaseResult = Readonly<{
  phase: ApplyPhaseName;
  results: readonly ApplyTaskResult[];
}>;

export type ApplyAllForAppOutput = Readonly<{
  phases: readonly ApplyPhaseResult[];
  deployed: boolean;
  deployError?: Error;
}>;

export type ApplyAllForAppInput = Readonly<{
  containers: ApplyAllContainers;
  customizeBasePath: string;
}>;

type ApplyTask = {
  readonly domain: ApplyDomain;
  readonly run: () => Promise<void>;
};

type PhaseDefinition = {
  readonly name: ApplyPhaseName;
  readonly tasks: readonly ApplyTask[];
};

function buildPhases(args: ApplyAllForAppInput): readonly PhaseDefinition[] {
  const c = args.containers;

  return [
    {
      name: "Schema",
      tasks: [
        {
          domain: "schema",
          run: async () => {
            await executeMigration({ container: c.schema });
          },
        },
      ],
    },
    {
      name: "Views & Customization",
      tasks: [
        {
          domain: "customize",
          run: async () => {
            await applyCustomization({
              container: c.customization,
              input: { basePath: args.customizeBasePath },
            });
          },
        },
        {
          domain: "view",
          run: async () => {
            await applyView({ container: c.view });
          },
        },
      ],
    },
    {
      name: "Permissions",
      tasks: [
        {
          domain: "field-acl",
          run: async () => {
            await applyFieldPermission({ container: c.fieldPermission });
          },
        },
        {
          domain: "app-acl",
          run: async () => {
            await applyAppPermission({ container: c.appPermission });
          },
        },
        {
          domain: "record-acl",
          run: async () => {
            await applyRecordPermission({ container: c.recordPermission });
          },
        },
      ],
    },
    {
      name: "Settings & Others",
      tasks: [
        {
          domain: "settings",
          run: async () => {
            await applyGeneralSettings({ container: c.settings });
          },
        },
        {
          domain: "notification",
          run: async () => {
            await applyNotification({ container: c.notification });
          },
        },
        {
          domain: "report",
          run: async () => {
            await applyReport({ container: c.report });
          },
        },
        {
          domain: "action",
          run: async () => {
            await applyAction({ container: c.action });
          },
        },
        {
          domain: "process",
          run: async () => {
            await applyProcessManagement({ container: c.process });
          },
        },
        {
          domain: "admin-notes",
          run: async () => {
            await applyAdminNotes({ container: c.adminNotes });
          },
        },
        {
          domain: "plugin",
          run: async () => {
            await applyPlugin({ container: c.plugin });
          },
        },
      ],
    },
    {
      name: "Seed Data",
      tasks: [
        {
          domain: "seed",
          run: async () => {
            await upsertSeed({ container: c.seed, input: {} });
          },
        },
      ],
    },
  ];
}

type AbortState = {
  aborted: boolean;
  reason: unknown;
  phaseName: ApplyPhaseName | undefined;
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
): ApplyPhaseResult {
  const skipError = createSkipError(state);
  return {
    phase: phase.name,
    results: phase.tasks.map((task) => ({
      domain: task.domain,
      success: false as const,
      error: skipError,
      skipped: true,
    })),
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

// Schema phase always has exactly one task (executeMigration).
// Deploy is called after the task to ensure schema changes are deployed
// before subsequent phases depend on them.
async function executeSchemaPhase(
  phase: PhaseDefinition,
  containers: ApplyAllContainers,
  state: AbortState,
): Promise<ApplyPhaseResult> {
  const results: ApplyTaskResult[] = [];
  for (const task of phase.tasks) {
    try {
      await task.run();
      await deployApp({ container: containers.schema });
      results.push({ domain: task.domain, success: true });
    } catch (error) {
      // Schema phase failure is always fatal regardless of isFatalError check.
      // Without a deployed schema, subsequent phases cannot function correctly.
      const err = toError(error);
      results.push({
        domain: task.domain,
        success: false,
        error: err,
        skipped: false,
      });
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
): Promise<ApplyPhaseResult> {
  const results: ApplyTaskResult[] = [];
  for (const task of phase.tasks) {
    if (state.aborted) {
      results.push({
        domain: task.domain,
        success: false,
        error: createSkipError(state),
        skipped: true,
      });
      continue;
    }

    try {
      await task.run();
      results.push({ domain: task.domain, success: true });
    } catch (error) {
      const err = toError(error);
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
 * Apply all domains for a single app in phased order.
 *
 * Phase 1 (Schema): executeMigration + deployApp. Failure is always fatal.
 * Phase 2-4: apply only (no deploy until all complete).
 * Phase 5 (Seed): upsertSeed (no deploy needed).
 *
 * After Phase 2-4 complete, a single deployApp is executed.
 * Fatal errors (auth/network) or Phase 1 failure abort all remaining phases.
 * Non-fatal errors in Phase 2-4 are recorded but do not block other domains.
 */
export async function applyAllForApp(
  args: ApplyAllForAppInput,
): Promise<ApplyAllForAppOutput> {
  const phases = buildPhases(args);
  const phaseResults: ApplyPhaseResult[] = [];
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

  // Deploy after Phase 2-4 complete (Phase 5 = Seed Data, no deploy needed)
  // Deploy even if some domains failed — successful changes should be deployed
  const needsDeploy = phaseResults.some(
    (pr) =>
      pr.phase !== "Schema" &&
      pr.phase !== "Seed Data" &&
      pr.results.some((r) => r.success),
  );

  const deployResult = needsDeploy
    ? await tryDeploy(args.containers)
    : { deployed: false };

  return {
    phases: phaseResults,
    deployed: deployResult.deployed,
    deployError: deployResult.error,
  };
}
