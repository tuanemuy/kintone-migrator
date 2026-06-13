import * as p from "@clack/prompts";
import pc from "picocolors";
import type {
  PullAllForAppOutput,
  PullDomain,
  PullTaskResult,
} from "@/core/application/pullAll/pullAllForApp";
import { formatErrorForDisplay, logError } from "./handleError";

const domainDisplayName: Record<PullDomain, string> = {
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

function formatTaskResult(result: PullTaskResult): string {
  const name = domainDisplayName[result.domain];
  if (result.success) {
    return `  ${pc.green("✓")} ${name}`;
  }
  if (result.skipped === "not-found") {
    return `  ${pc.yellow("⊘")} ${name} ${pc.dim("—")} ${pc.yellow("skipped (file not found)")}`;
  }
  if (result.skipped === "conflict") {
    return `  ${pc.yellow("⊘")} ${name} ${pc.dim("—")} ${pc.yellow(`skipped (conflict — run \`${result.domain} pull\` to resolve)`)}`;
  }
  if (result.skipped === "aborted") {
    return `  ${pc.yellow("⊘")} ${name} ${pc.dim("—")} ${pc.yellow("skipped")}`;
  }
  return `  ${pc.red("✗")} ${name} ${pc.dim("—")} ${pc.red(`failed (${formatErrorForDisplay(result.error)})`)}`;
}

export function printPullAllResults(output: PullAllForAppOutput): void {
  p.log.step(`\n${"─".repeat(40)}`);
  p.log.step(pc.bold("Pull Results:"));

  if (output.revisionSkip) {
    p.log.success(
      "Remote revision unchanged since base — all domains up to date (skipped).",
    );
    return;
  }

  for (const result of output.results) {
    p.log.message(formatTaskResult(result));
    if (!result.success && result.skipped === false) {
      logError(result.error);
    }
  }

  const conflicts = output.results.filter(
    (r) => !r.success && r.skipped === "conflict",
  );
  if (conflicts.length > 0) {
    const hints = conflicts.map((r) => `\`${r.domain} pull\``).join(", ");
    p.log.warn(
      `${conflicts.length} domain(s) had conflicts and were skipped. Resolve them with ${hints} (use --ours/--theirs to auto-resolve in --all).`,
    );
  }
}

/**
 * True when any domain genuinely failed (execution error or aborted skip).
 * `not-found` and `conflict` skips are expected, recoverable outcomes and are
 * not treated as failures.
 */
export function pullAllHasFailure(output: PullAllForAppOutput): boolean {
  return output.results.some(
    (r) => !r.success && r.skipped !== "not-found" && r.skipped !== "conflict",
  );
}
