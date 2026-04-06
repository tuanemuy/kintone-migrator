import type { ActionDiffEntry } from "@/core/application/action/detectActionDiff";
import { detectActionDiff } from "@/core/application/action/detectActionDiff";
import type { AdminNotesDiffEntry } from "@/core/application/adminNotes/detectAdminNotesDiff";
import { detectAdminNotesDiff } from "@/core/application/adminNotes/detectAdminNotesDiff";
import type { AppPermissionDiffEntry } from "@/core/application/appPermission/detectAppPermissionDiff";
import { detectAppPermissionDiff } from "@/core/application/appPermission/detectAppPermissionDiff";
import type { DiffAllContainers } from "@/core/application/container/diffAll";
import type { CustomizationDiffEntry } from "@/core/application/customization/detectCustomizationDiff";
import { detectCustomizationDiff } from "@/core/application/customization/detectCustomizationDiff";
import {
  isFatalError,
  SystemError,
  SystemErrorCode,
} from "@/core/application/error";
import type { FieldPermissionDiffEntry } from "@/core/application/fieldPermission/detectFieldPermissionDiff";
import { detectFieldPermissionDiff } from "@/core/application/fieldPermission/detectFieldPermissionDiff";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";
import type { GeneralSettingsDiffEntry } from "@/core/application/generalSettings/detectGeneralSettingsDiff";
import { detectGeneralSettingsDiff } from "@/core/application/generalSettings/detectGeneralSettingsDiff";
import type { NotificationDiffEntry } from "@/core/application/notification/detectNotificationDiff";
import { detectNotificationDiff } from "@/core/application/notification/detectNotificationDiff";
import type { PluginDiffEntry } from "@/core/application/plugin/detectPluginDiff";
import { detectPluginDiff } from "@/core/application/plugin/detectPluginDiff";
import type { ProcessManagementDiffEntry } from "@/core/application/processManagement/detectProcessManagementDiff";
import { detectProcessManagementDiff } from "@/core/application/processManagement/detectProcessManagementDiff";
import type { RecordPermissionDiffEntry } from "@/core/application/recordPermission/detectRecordPermissionDiff";
import { detectRecordPermissionDiff } from "@/core/application/recordPermission/detectRecordPermissionDiff";
import type { ReportDiffEntry } from "@/core/application/report/detectReportDiff";
import { detectReportDiff } from "@/core/application/report/detectReportDiff";
import type { ViewDiffEntry } from "@/core/application/view/detectViewDiff";
import { detectViewDiff } from "@/core/application/view/detectViewDiff";
import type { DiffResult } from "@/core/domain/diff";

export type DiffDomain =
  | "schema"
  | "customize"
  | "view"
  | "settings"
  | "notification"
  | "report"
  | "action"
  | "process"
  | "field-acl"
  | "app-acl"
  | "record-acl"
  | "admin-notes"
  | "plugin";

export type DiffTaskSuccess =
  | Readonly<{ domain: "schema"; success: true; result: DetectDiffOutput }>
  | Readonly<{
      domain: "customize";
      success: true;
      result: DiffResult<CustomizationDiffEntry>;
    }>
  | Readonly<{
      domain: "view";
      success: true;
      result: DiffResult<ViewDiffEntry>;
    }>
  | Readonly<{
      domain: "settings";
      success: true;
      result: DiffResult<GeneralSettingsDiffEntry>;
    }>
  | Readonly<{
      domain: "notification";
      success: true;
      result: DiffResult<NotificationDiffEntry>;
    }>
  | Readonly<{
      domain: "report";
      success: true;
      result: DiffResult<ReportDiffEntry>;
    }>
  | Readonly<{
      domain: "action";
      success: true;
      result: DiffResult<ActionDiffEntry>;
    }>
  | Readonly<{
      domain: "process";
      success: true;
      result: DiffResult<ProcessManagementDiffEntry>;
    }>
  | Readonly<{
      domain: "field-acl";
      success: true;
      result: DiffResult<FieldPermissionDiffEntry>;
    }>
  | Readonly<{
      domain: "app-acl";
      success: true;
      result: DiffResult<AppPermissionDiffEntry>;
    }>
  | Readonly<{
      domain: "record-acl";
      success: true;
      result: DiffResult<RecordPermissionDiffEntry>;
    }>
  | Readonly<{
      domain: "admin-notes";
      success: true;
      result: DiffResult<AdminNotesDiffEntry>;
    }>
  | Readonly<{
      domain: "plugin";
      success: true;
      result: DiffResult<PluginDiffEntry>;
    }>;

export type DiffTaskFailure = Readonly<{
  domain: DiffDomain;
  success: false;
  error: Error;
}>;

export type DiffTaskResult = DiffTaskSuccess | DiffTaskFailure;

type DiffTask = {
  readonly domain: DiffDomain;
  readonly run: () => Promise<DiffTaskResult>;
};

export type DiffAllForAppInput = Readonly<{
  containers: DiffAllContainers;
  customizeBasePath: string;
}>;

function buildDiffTasks(args: DiffAllForAppInput): readonly DiffTask[] {
  const c = args.containers;

  return [
    {
      domain: "schema",
      run: async () => ({
        domain: "schema" as const,
        success: true as const,
        result: await detectDiff({ container: c.schema }),
      }),
    },
    {
      domain: "customize",
      run: async () => ({
        domain: "customize" as const,
        success: true as const,
        result: await detectCustomizationDiff({
          container: c.customization,
          input: { basePath: args.customizeBasePath },
        }),
      }),
    },
    {
      domain: "view",
      run: async () => ({
        domain: "view" as const,
        success: true as const,
        result: await detectViewDiff({ container: c.view }),
      }),
    },
    {
      domain: "settings",
      run: async () => ({
        domain: "settings" as const,
        success: true as const,
        result: await detectGeneralSettingsDiff({ container: c.settings }),
      }),
    },
    {
      domain: "notification",
      run: async () => ({
        domain: "notification" as const,
        success: true as const,
        result: await detectNotificationDiff({ container: c.notification }),
      }),
    },
    {
      domain: "report",
      run: async () => ({
        domain: "report" as const,
        success: true as const,
        result: await detectReportDiff({ container: c.report }),
      }),
    },
    {
      domain: "action",
      run: async () => ({
        domain: "action" as const,
        success: true as const,
        result: await detectActionDiff({ container: c.action }),
      }),
    },
    {
      domain: "process",
      run: async () => ({
        domain: "process" as const,
        success: true as const,
        result: await detectProcessManagementDiff({ container: c.process }),
      }),
    },
    {
      domain: "field-acl",
      run: async () => ({
        domain: "field-acl" as const,
        success: true as const,
        result: await detectFieldPermissionDiff({
          container: c.fieldPermission,
        }),
      }),
    },
    {
      domain: "app-acl",
      run: async () => ({
        domain: "app-acl" as const,
        success: true as const,
        result: await detectAppPermissionDiff({ container: c.appPermission }),
      }),
    },
    {
      domain: "record-acl",
      run: async () => ({
        domain: "record-acl" as const,
        success: true as const,
        result: await detectRecordPermissionDiff({
          container: c.recordPermission,
        }),
      }),
    },
    {
      domain: "admin-notes",
      run: async () => ({
        domain: "admin-notes" as const,
        success: true as const,
        result: await detectAdminNotesDiff({ container: c.adminNotes }),
      }),
    },
    {
      domain: "plugin",
      run: async () => ({
        domain: "plugin" as const,
        success: true as const,
        result: await detectPluginDiff({ container: c.plugin }),
      }),
    },
  ];
}

/** Number of domains to diff concurrently within each batch. */
export const DIFF_BATCH_SIZE = 4;

/**
 * Run diff detection for all 13 domains, processing tasks in concurrent batches.
 *
 * Domains within the same batch run in parallel via `Promise.allSettled`.
 * After each batch, fatal errors (auth/network) abort all remaining batches.
 * Non-fatal errors within a batch do not affect other tasks in the same batch
 * or subsequent batches.
 */
export async function diffAllForApp(
  args: DiffAllForAppInput,
): Promise<readonly DiffTaskResult[]> {
  const tasks = buildDiffTasks(args);
  const results: DiffTaskResult[] = [];

  for (let i = 0; i < tasks.length; i += DIFF_BATCH_SIZE) {
    const batch = tasks.slice(i, i + DIFF_BATCH_SIZE);

    const settled = await Promise.allSettled(batch.map((task) => task.run()));

    let fatalDomain: DiffDomain | undefined;
    let fatalReason: unknown;

    for (const [j, outcome] of settled.entries()) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        const error =
          outcome.reason instanceof Error
            ? outcome.reason
            : new Error(String(outcome.reason));
        results.push({ domain: batch[j].domain, success: false, error });
        if (isFatalError(error) && fatalDomain === undefined) {
          fatalDomain = batch[j].domain;
          fatalReason = error;
        }
      }
    }

    if (fatalDomain !== undefined) {
      const skipError = new SystemError(
        SystemErrorCode.InternalServerError,
        `Skipped due to fatal error in "${fatalDomain}"`,
        fatalReason,
      );
      for (const remaining of tasks.slice(i + DIFF_BATCH_SIZE)) {
        results.push({
          domain: remaining.domain,
          success: false,
          error: skipError,
        });
      }
      break;
    }
  }

  return results;
}
