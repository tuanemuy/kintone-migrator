import * as p from "@clack/prompts";
import pc from "picocolors";
import type {
  DiffDomain,
  DiffTaskResult,
} from "@/core/application/diffAll/diffAllForApp";
import { formatErrorForDisplay, logError } from "./handleError";
import {
  printActionDiffResult,
  printAdminNotesDiffResult,
  printAppPermissionDiffResult,
  printCustomizationDiffResult,
  printDiffResult,
  printFieldPermissionDiffResult,
  printGeneralSettingsDiffResult,
  printNotificationDiffResult,
  printPluginDiffResult,
  printProcessDiffResult,
  printRecordPermissionDiffResult,
  printReportDiffResult,
  printViewDiffResult,
} from "./output";

const domainDisplayName: Record<DiffDomain, string> = {
  schema: "Schema",
  customize: "Customization",
  view: "View",
  settings: "General Settings",
  notification: "Notification",
  report: "Report",
  action: "Action",
  process: "Process Management",
  "field-acl": "Field Permission",
  "app-acl": "App Permission",
  "record-acl": "Record Permission",
  "admin-notes": "Admin Notes",
  plugin: "Plugin",
};

function printSuccessResult(result: DiffTaskResult & { success: true }): void {
  switch (result.domain) {
    case "schema":
      printDiffResult(result.result);
      break;
    case "customize":
      printCustomizationDiffResult(result.result);
      break;
    case "view":
      printViewDiffResult(result.result);
      break;
    case "settings":
      printGeneralSettingsDiffResult(result.result);
      break;
    case "notification":
      printNotificationDiffResult(result.result);
      break;
    case "report":
      printReportDiffResult(result.result);
      break;
    case "action":
      printActionDiffResult(result.result);
      break;
    case "process":
      printProcessDiffResult(result.result);
      break;
    case "field-acl":
      printFieldPermissionDiffResult(result.result);
      break;
    case "app-acl":
      printAppPermissionDiffResult(result.result);
      break;
    case "record-acl":
      printRecordPermissionDiffResult(result.result);
      break;
    case "admin-notes":
      printAdminNotesDiffResult(result.result);
      break;
    case "plugin":
      printPluginDiffResult(result.result);
      break;
    default:
      result satisfies never;
  }
}

function isResultEmpty(result: DiffTaskResult & { success: true }): boolean {
  return result.result.isEmpty;
}

function formatSummaryLine(result: DiffTaskResult): string {
  const name = domainDisplayName[result.domain];
  const padded = `${name}:`.padEnd(22);

  if (!result.success) {
    return `  ${padded}${pc.red(`failed (${formatErrorForDisplay(result.error)})`)}`;
  }

  if (isResultEmpty(result)) {
    return `  ${padded}${pc.dim("no changes")}`;
  }

  const { summary } = result.result;
  const parts: string[] = [];
  if (summary.added > 0) parts.push(pc.green(`+${summary.added} added`));
  if (summary.modified > 0)
    parts.push(pc.yellow(`~${summary.modified} modified`));
  if (summary.deleted > 0) parts.push(pc.red(`-${summary.deleted} deleted`));

  // schema has hasLayoutChanges that isn't in summary counts
  if (result.domain === "schema" && result.result.hasLayoutChanges) {
    parts.push(pc.yellow("layout changes"));
  }

  return `  ${padded}${parts.join(pc.dim(" | "))}`;
}

export function printDiffAllResults(results: readonly DiffTaskResult[]): void {
  // Print detailed results per domain
  for (const result of results) {
    const displayName = domainDisplayName[result.domain];
    p.log.step(`\n--- ${pc.bold(displayName)} ---`);

    if (result.success) {
      printSuccessResult(result);
    } else {
      p.log.error(
        `  ${pc.red("\u2717")} ${formatErrorForDisplay(result.error)}`,
      );
      logError(result.error);
    }
  }

  // Print summary
  const withChanges = results.filter(
    (r) => r.success && !isResultEmpty(r),
  ).length;
  const noChanges = results.filter((r) => r.success && isResultEmpty(r)).length;
  const failed = results.filter((r) => !r.success).length;

  p.log.step(`\n${"─".repeat(40)}`);
  p.log.step(pc.bold("Summary:"));
  for (const result of results) {
    p.log.message(formatSummaryLine(result));
  }
  p.log.step(`${"─".repeat(40)}`);

  const parts: string[] = [];
  if (withChanges > 0) parts.push(pc.yellow(`${withChanges} with changes`));
  if (noChanges > 0) parts.push(pc.dim(`${noChanges} no changes`));
  if (failed > 0) parts.push(pc.red(`${failed} failed`));
  p.log.message(`  ${parts.join(pc.dim(", "))}`);
}
