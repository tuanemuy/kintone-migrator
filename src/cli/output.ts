import * as p from "@clack/prompts";
import pc from "picocolors";
import type { Container } from "@/core/application/container";
import { deployApp } from "@/core/application/formSchema/deployApp";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";
import type { MultiAppResult } from "@/core/domain/projectConfig/entity";

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

  p.note(lines.join("\n"), "Diff Details");
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
        break;
      case "skipped":
        p.log.warn(`  ${pc.dim("-")} Skipped: ${r.name}`);
        break;
    }
  }
}

export async function promptDeploy(container: Container): Promise<void> {
  const shouldDeploy = await p.confirm({
    message: "運用環境に反映しますか？",
  });

  if (p.isCancel(shouldDeploy) || !shouldDeploy) {
    p.log.warn("テスト環境に反映済みですが、運用環境には反映されていません。");
    return;
  }

  const ds = p.spinner();
  ds.start("運用環境に反映しています...");
  await deployApp({ container });
  ds.stop("運用環境への反映が完了しました。");

  p.log.success("運用環境への反映が完了しました。");
}
