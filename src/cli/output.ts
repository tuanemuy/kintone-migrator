import * as p from "@clack/prompts";
import pc from "picocolors";
import type { FormSchemaContainer } from "@/core/application/container/formSchema";
import { deployApp } from "@/core/application/formSchema/deployApp";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";
import type { ActionDiffEntry } from "@/core/domain/action/valueObject";
import type { AdminNotesDiffEntry } from "@/core/domain/adminNotes/valueObject";
import type { AppPermissionDiffEntry } from "@/core/domain/appPermission/valueObject";
import type { CustomizationDiffEntry } from "@/core/domain/customization/valueObject";
import {
  buildDiffResult,
  type DiffResult,
  type DiffSummary,
} from "@/core/domain/diff";
import type { FieldPermissionDiffEntry } from "@/core/domain/fieldPermission/valueObject";
import type { GeneralSettingsDiffEntry } from "@/core/domain/generalSettings/valueObject";
import type { NotificationDiffEntry } from "@/core/domain/notification/valueObject";
import type { PluginDiffEntry } from "@/core/domain/plugin/valueObject";
import type { ProcessManagementDiffEntry } from "@/core/domain/processManagement/valueObject";
import type { MultiAppResult } from "@/core/domain/projectConfig/entity";
import type { RecordPermissionDiffEntry } from "@/core/domain/recordPermission/valueObject";
import type { ReportDiffEntry } from "@/core/domain/report/valueObject";
import type { ViewDiffEntry } from "@/core/domain/view/valueObject";
import { logError } from "./handleError";

function formatDiffSummary(summary: DiffSummary): string {
  return [
    summary.added > 0 ? pc.green(`+${summary.added} added`) : null,
    summary.modified > 0 ? pc.yellow(`~${summary.modified} modified`) : null,
    summary.deleted > 0 ? pc.red(`-${summary.deleted} deleted`) : null,
  ]
    .filter(Boolean)
    .join(pc.dim("  |  "));
}

function colorizeDiffEntry(type: "added" | "modified" | "deleted"): {
  colorize: (text: string | number) => string;
  prefix: string;
} {
  const colorize =
    type === "added" ? pc.green : type === "deleted" ? pc.red : pc.yellow;
  const prefix = type === "added" ? "+" : type === "deleted" ? "-" : "~";
  return { colorize, prefix };
}

function printGenericDiffResult<
  E extends { type: "added" | "modified" | "deleted" },
>(
  result: DiffResult<E>,
  title: string,
  formatEntry: (
    entry: E,
    colorize: (s: string | number) => string,
    prefix: string,
  ) => string,
): void {
  if (result.isEmpty) {
    p.log.info("No changes detected.");
    return;
  }

  p.log.info(`Changes: ${formatDiffSummary(result.summary)}`);

  const lines = result.entries.map((entry) => {
    const { colorize, prefix } = colorizeDiffEntry(entry.type);
    return formatEntry(entry, colorize, prefix);
  });

  p.note(lines.join("\n"), title, { format: (v) => v });
}

// printDiffResult does not use printGenericDiffResult because DetectDiffOutput
// requires special handling for hasLayoutChanges (shown between summary and note)
// that doesn't fit the generic pattern.
export function printDiffResult(result: DetectDiffOutput): void {
  if (result.isEmpty) {
    p.log.info("No changes detected.");
    return;
  }

  p.log.info(`Changes: ${formatDiffSummary(result.summary)}`);

  if (result.hasLayoutChanges) {
    p.log.info("Layout changes detected.");
  }

  const lines = result.entries.map((entry) => {
    const { colorize, prefix } = colorizeDiffEntry(entry.type);
    return `${colorize(prefix)} ${pc.dim("[")}${colorize(entry.fieldCode)}${pc.dim("]")} ${entry.fieldLabel}${pc.dim(":")} ${entry.details}`;
  });

  p.note(lines.join("\n"), "Diff Details", { format: (v) => v });
}

export function printViewDiffResult(result: DiffResult<ViewDiffEntry>): void {
  printGenericDiffResult(
    result,
    "View Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${colorize(entry.viewName)}${pc.dim(":")} ${entry.details}`,
  );
}

export function printProcessDiffResult(
  result: DiffResult<ProcessManagementDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "Process Management Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${pc.dim("[")}${colorize(entry.category)}${pc.dim("]")} ${entry.name}${pc.dim(":")} ${entry.details}`,
  );
}

export function printAdminNotesDiffResult(
  result: DiffResult<AdminNotesDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "Admin Notes Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${colorize(entry.field)}${pc.dim(":")} ${entry.details}`,
  );
}

export function printGeneralSettingsDiffResult(
  result: DiffResult<GeneralSettingsDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "General Settings Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${colorize(entry.field)}${pc.dim(":")} ${entry.details}`,
  );
}

export function printAppPermissionDiffResult(
  result: DiffResult<AppPermissionDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "App Permission Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${colorize(entry.entityKey)}${pc.dim(":")} ${entry.details}`,
  );
}

export function printFieldPermissionDiffResult(
  result: DiffResult<FieldPermissionDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "Field Permission Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${pc.dim("[")}${colorize(entry.fieldCode)}${pc.dim("]")} ${entry.details}`,
  );
}

export function printCustomizationDiffResult(
  result: DiffResult<CustomizationDiffEntry>,
): void {
  // Separate warning entries (e.g. duplicate basenames) from actual diff entries
  // so that warnings don't inflate the summary counts.
  const warnings = result.entries.filter((e) => e.name === "(warning)");
  const actualEntries = result.entries.filter((e) => e.name !== "(warning)");
  const adjustedResult = buildDiffResult(actualEntries);

  for (const w of warnings) {
    p.log.warn(w.details);
  }

  printGenericDiffResult(
    adjustedResult,
    "Customization Diff Details",
    (entry, colorize, prefix) => {
      const location =
        entry.platform === "config"
          ? entry.resourceType
          : `${entry.platform}.${entry.resourceType}`;
      return `${colorize(prefix)} ${pc.dim("[")}${colorize(location)}${pc.dim("]")} ${entry.name}${pc.dim(":")} ${entry.details}`;
    },
  );
}

export function printNotificationDiffResult(
  result: DiffResult<NotificationDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "Notification Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${pc.dim("[")}${colorize(entry.section)}${pc.dim("]")} ${entry.name}${pc.dim(":")} ${entry.details}`,
  );
}

export function printActionDiffResult(
  result: DiffResult<ActionDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "Action Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${colorize(entry.actionName)}${pc.dim(":")} ${entry.details}`,
  );
}

export function printPluginDiffResult(
  result: DiffResult<PluginDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "Plugin Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${colorize(entry.pluginId)}${pc.dim(":")} ${entry.details}`,
  );
}

export function printRecordPermissionDiffResult(
  result: DiffResult<RecordPermissionDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "Record Permission Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${pc.dim("[")}${colorize(entry.filterCond === "" ? "(all records)" : entry.filterCond)}${pc.dim("]")} ${entry.details}`,
  );
}

export function printReportDiffResult(
  result: DiffResult<ReportDiffEntry>,
): void {
  printGenericDiffResult(
    result,
    "Report Diff Details",
    (entry, colorize, prefix) =>
      `${colorize(prefix)} ${colorize(entry.reportName)}${pc.dim(":")} ${entry.details}`,
  );
}

export function printAppHeader(appName: string, appId: string): void {
  p.log.step(`\n=== [${pc.bold(appName)}] (app: ${appId}) ===`);
}

export function printMultiAppResult(result: MultiAppResult): void {
  p.log.step("");

  for (const r of result.results) {
    switch (r.status) {
      case "succeeded":
        p.log.success(`  ${pc.green("\u2713")} Succeeded: ${r.name}`);
        break;
      case "failed":
        p.log.error(`  ${pc.red("\u2717")} Failed: ${r.name}`);
        if (r.error) {
          logError(r.error);
        }
        break;
      case "skipped":
        p.log.warn(`  ${pc.dim("-")} Skipped: ${r.name}`);
        break;
      default:
        r.status satisfies never;
        break;
    }
  }
}

export type Deployable = {
  readonly appDeployer: { deploy: () => Promise<void> };
};

export async function confirmAndDeploy(
  containers: readonly Deployable[],
  skipConfirm: boolean,
  successMessage = "Deployed to production.",
): Promise<void> {
  if (!skipConfirm) {
    const shouldDeploy = await p.confirm({
      message: "Deploy to production?",
    });

    if (p.isCancel(shouldDeploy) || !shouldDeploy) {
      p.log.warn("Applied to preview, but not deployed to production.");
      return;
    }
  }

  const ds = p.spinner();
  ds.start("Deploying to production...");
  try {
    for (const container of containers) {
      await container.appDeployer.deploy();
    }
    ds.stop("Deployed to production.");
  } catch (error) {
    ds.stop("Deployment failed.");
    throw error;
  }

  p.log.success(successMessage);
}

export async function promptDeploy(
  container: FormSchemaContainer,
  skipConfirm: boolean,
): Promise<void> {
  if (!skipConfirm) {
    const shouldDeploy = await p.confirm({
      message: "Deploy to production?",
    });

    if (p.isCancel(shouldDeploy) || !shouldDeploy) {
      p.log.warn("Applied to preview, but not deployed to production.");
      return;
    }
  }

  const ds = p.spinner();
  ds.start("Deploying to production...");
  try {
    await deployApp({ container });
    ds.stop("Deployment complete.");
  } catch (error) {
    ds.stop("Deployment failed.");
    throw error;
  }

  p.log.success("Deployed to production.");
}
