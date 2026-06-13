import * as p from "@clack/prompts";
import pc from "picocolors";
import type {
  PushAllForAppOutput,
  PushDomain,
  PushPhaseResult,
  PushTaskResult,
} from "@/core/application/pushAll/pushAllForApp";
import { formatErrorForDisplay, logError } from "./handleError";

const domainDisplayName: Record<PushDomain, string> = {
  schema: "Schema",
  customize: "Customization",
  view: "View",
  "field-acl": "Field Permission",
  "app-acl": "App Permission",
  "record-acl": "Record Permission",
  settings: "General Settings",
  notification: "Notification",
  report: "Report",
  action: "Action",
  process: "Process Management",
  "admin-notes": "Admin Notes",
  plugin: "Plugin",
};

function formatTaskResult(result: PushTaskResult): string {
  const name = domainDisplayName[result.domain];
  if (result.success) {
    return `  ${pc.green("✓")} ${name}`;
  }
  if (result.skipped === "not-found") {
    return `  ${pc.yellow("⊘")} ${name} ${pc.dim("—")} ${pc.yellow("skipped (file not found)")}`;
  }
  if (result.skipped === "drift") {
    return `  ${pc.yellow("⊘")} ${name} ${pc.dim("—")} ${pc.yellow(`skipped (remote drifted — run \`${result.domain} pull\` first)`)}`;
  }
  if (result.skipped === "aborted") {
    return `  ${pc.yellow("⊘")} ${name} ${pc.dim("—")} ${pc.yellow("skipped")}`;
  }
  return `  ${pc.red("✗")} ${name} ${pc.dim("—")} ${pc.red(`failed (${formatErrorForDisplay(result.error)})`)}`;
}

function printPhaseResult(phaseResult: PushPhaseResult): void {
  p.log.step(pc.bold(`Phase: ${phaseResult.phase}`));
  for (const result of phaseResult.results) {
    p.log.message(formatTaskResult(result));
    if (!result.success && result.skipped === false) {
      logError(result.error);
    }
  }
}

export function printPushAllResults(output: PushAllForAppOutput): void {
  p.log.step(`\n${"─".repeat(40)}`);
  p.log.step(pc.bold("Push Results:"));

  for (const phaseResult of output.phases) {
    printPhaseResult(phaseResult);
  }

  if (output.deployed) {
    p.log.success("Deployed to production.");
  } else if (output.deployError) {
    p.log.error(`Deploy failed: ${formatErrorForDisplay(output.deployError)}`);
  }
}

/**
 * True when any domain genuinely failed (execution error or aborted skip) or a
 * required deploy failed. `not-found`, `drift`, and successful pushes are not
 * failures — drift is an expected, recoverable `--all` outcome.
 */
export function pushAllHasFailure(output: PushAllForAppOutput): boolean {
  const taskFailure = output.phases
    .flatMap((pr) => pr.results)
    .some(
      (r) => !r.success && r.skipped !== "not-found" && r.skipped !== "drift",
    );
  return taskFailure || output.deployError !== undefined;
}
