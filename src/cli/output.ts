import * as p from "@clack/prompts";
import pc from "picocolors";
import type { Container } from "@/core/application/container";
import { deployApp } from "@/core/application/formSchema/deployApp";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";
import type { DiffProcessManagementOutput } from "@/core/application/processManagement/diffProcessManagement";
import type { DetectViewDiffOutput } from "@/core/application/view/dto";
import type { MultiAppResult } from "@/core/domain/projectConfig/entity";
import { logError } from "./handleError";

export function printDiffResult(result: DetectDiffOutput): void {
  const { summary } = result;

  if (result.isEmpty) {
    p.log.info("No changes detected.");
    return;
  }

  const summaryParts = [
    summary.added > 0 ? pc.green(`+${summary.added} added`) : null,
    summary.modified > 0 ? pc.yellow(`~${summary.modified} modified`) : null,
    summary.deleted > 0 ? pc.red(`-${summary.deleted} deleted`) : null,
  ]
    .filter(Boolean)
    .join(pc.dim("  |  "));

  p.log.info(`Changes: ${summaryParts}`);

  if (result.hasLayoutChanges) {
    p.log.info("Layout changes detected.");
  }

  const lines = result.entries.map((entry) => {
    const colorize =
      entry.type === "added"
        ? pc.green
        : entry.type === "deleted"
          ? pc.red
          : pc.yellow;
    const prefix =
      entry.type === "added" ? "+" : entry.type === "deleted" ? "-" : "~";
    return `${colorize(prefix)} ${pc.dim("[")}${colorize(entry.fieldCode)}${pc.dim("]")} ${entry.fieldLabel}${pc.dim(":")} ${entry.details}`;
  });

  p.note(lines.join("\n"), "Diff Details", { format: (v) => v });
}

export function printViewDiffResult(result: DetectViewDiffOutput): void {
  const { summary } = result;

  if (result.isEmpty) {
    p.log.info("No changes detected.");
    return;
  }

  const summaryParts = [
    summary.added > 0 ? pc.green(`+${summary.added} added`) : null,
    summary.modified > 0 ? pc.yellow(`~${summary.modified} modified`) : null,
    summary.deleted > 0 ? pc.red(`-${summary.deleted} deleted`) : null,
  ]
    .filter(Boolean)
    .join(pc.dim("  |  "));

  p.log.info(`Changes: ${summaryParts}`);

  const lines = result.entries.map((entry) => {
    const colorize =
      entry.type === "added"
        ? pc.green
        : entry.type === "deleted"
          ? pc.red
          : pc.yellow;
    const prefix =
      entry.type === "added" ? "+" : entry.type === "deleted" ? "-" : "~";
    return `${colorize(prefix)} ${colorize(entry.viewName)}${pc.dim(":")} ${entry.details}`;
  });

  p.note(lines.join("\n"), "View Diff Details", { format: (v) => v });
}

export function printProcessDiffResult(
  result: DiffProcessManagementOutput,
): void {
  const { summary } = result;

  if (result.isEmpty) {
    p.log.info("No changes detected.");
    return;
  }

  const summaryParts = [
    summary.added > 0 ? pc.green(`+${summary.added} added`) : null,
    summary.modified > 0 ? pc.yellow(`~${summary.modified} modified`) : null,
    summary.deleted > 0 ? pc.red(`-${summary.deleted} deleted`) : null,
  ]
    .filter(Boolean)
    .join(pc.dim("  |  "));

  p.log.info(`Changes: ${summaryParts}`);

  const lines = result.entries.map((entry) => {
    const colorize =
      entry.type === "added"
        ? pc.green
        : entry.type === "deleted"
          ? pc.red
          : pc.yellow;
    const prefix =
      entry.type === "added" ? "+" : entry.type === "deleted" ? "-" : "~";
    return `${colorize(prefix)} ${pc.dim("[")}${colorize(entry.category)}${pc.dim("]")} ${entry.name}${pc.dim(":")} ${entry.details}`;
  });

  p.note(lines.join("\n"), "Process Management Diff Details", {
    format: (v) => v,
  });
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

export async function promptDeploy(
  container: Container,
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
  await deployApp({ container });
  ds.stop("Deployed to production.");

  p.log.success("Deployed to production.");
}
