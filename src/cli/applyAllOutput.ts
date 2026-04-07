import * as p from "@clack/prompts";
import pc from "picocolors";
import type {
  ApplyAllForAppOutput,
  ApplyDomain,
  ApplyPhaseResult,
  ApplyTaskResult,
} from "@/core/application/applyAll/applyAllForApp";
import { formatErrorForDisplay, logError } from "./handleError";

const domainDisplayName: Record<ApplyDomain, string> = {
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
  seed: "Seed Data",
};

function formatTaskResult(result: ApplyTaskResult): string {
  const name = domainDisplayName[result.domain];
  if (result.success) {
    return `  ${pc.green("\u2713")} ${name}`;
  }
  if (result.skipped) {
    return `  ${pc.yellow("\u2298")} ${name} ${pc.dim("\u2014")} ${pc.yellow("skipped")}`;
  }
  return `  ${pc.red("\u2717")} ${name} ${pc.dim("\u2014")} ${pc.red(`failed (${formatErrorForDisplay(result.error)})`)}`;
}

function printPhaseResult(phaseResult: ApplyPhaseResult): void {
  p.log.step(pc.bold(`Phase: ${phaseResult.phase}`));

  for (const result of phaseResult.results) {
    p.log.message(formatTaskResult(result));
    if (!result.success && !result.skipped) {
      logError(result.error);
    }
  }
}

export function printApplyAllResults(output: ApplyAllForAppOutput): void {
  p.log.step(`\n${"─".repeat(40)}`);
  p.log.step(pc.bold("Apply Results:"));

  for (const phaseResult of output.phases) {
    printPhaseResult(phaseResult);
  }

  // Deploy status
  p.log.step(`${"─".repeat(40)}`);

  const allResults = output.phases.flatMap((pr) => pr.results);
  const succeeded = allResults.filter((r) => r.success).length;
  const failed = allResults.filter((r) => !r.success && !r.skipped).length;
  const skipped = allResults.filter((r) => !r.success && r.skipped).length;

  if (output.deployed) {
    p.log.success("Deployed to production.");
  } else if (output.deployError) {
    p.log.warn(
      `Deployment failed: ${formatErrorForDisplay(output.deployError)}`,
    );
  } else if (succeeded === 0) {
    p.log.warn("Not deployed due to errors.");
  } else if (failed > 0 || skipped > 0) {
    // Deploy was intentionally skipped because no Phase 2-4 domains succeeded.
    // Schema was already deployed in Phase 1, and seed doesn't need deploy.
    p.log.info(
      "Deployment skipped (no Phase 2-4 changes applied successfully).",
    );
  }

  // Summary
  const parts: string[] = [];
  if (succeeded > 0) parts.push(pc.green(`${succeeded} succeeded`));
  if (failed > 0) parts.push(pc.red(`${failed} failed`));
  if (skipped > 0) parts.push(pc.yellow(`${skipped} skipped`));
  p.log.message(
    `  Summary: ${parts.length > 0 ? parts.join(pc.dim(" | ")) : "No domains processed"}`,
  );
}
