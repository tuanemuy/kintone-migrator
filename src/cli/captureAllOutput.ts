import * as p from "@clack/prompts";
import pc from "picocolors";
import type {
  CaptureDomain,
  CaptureResult,
} from "@/core/application/init/captureAllForApp";
import type { AppFilePaths } from "@/core/domain/projectConfig/appFilePaths";
import { formatErrorForDisplay, logError } from "./handleError";

const domainPathKey: Record<CaptureDomain, keyof AppFilePaths> = {
  schema: "schema",
  customize: "customize",
  view: "view",
  settings: "settings",
  notification: "notification",
  report: "report",
  action: "action",
  process: "process",
  plugin: "plugin",
  seed: "seed",
  "field-acl": "fieldAcl",
  "app-acl": "appAcl",
  "record-acl": "recordAcl",
  "admin-notes": "adminNotes",
};

export function printCaptureAllResults(
  results: readonly CaptureResult[],
  paths: AppFilePaths,
): void {
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  p.log.step(`\n${"─".repeat(40)}`);
  p.log.step(pc.bold("Capture Results:"));

  for (const result of results) {
    const filePath = paths[domainPathKey[result.domain]];

    if (result.success) {
      p.log.message(
        `  ${pc.green("✓")} ${result.domain} ${pc.dim("—")} saved to ${pc.dim(filePath)}`,
      );
    } else {
      p.log.message(
        `  ${pc.red("✗")} ${result.domain} ${pc.dim("—")} ${pc.red(`failed (${formatErrorForDisplay(result.error)})`)}`,
      );
      logError(result.error);
    }
  }

  p.log.step(`${"─".repeat(40)}`);

  const parts: string[] = [];
  if (succeeded > 0) parts.push(pc.green(`${succeeded} succeeded`));
  if (failed > 0) parts.push(pc.red(`${failed} failed`));
  p.log.message(`  Summary: ${parts.join(pc.dim(" | "))}`);
}
