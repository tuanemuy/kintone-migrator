import { dirname, resolve } from "node:path";
import { captureAction } from "@/core/application/action/captureAction";
import { saveAction } from "@/core/application/action/saveAction";
import { captureAdminNotes } from "@/core/application/adminNotes/captureAdminNotes";
import { saveAdminNotes } from "@/core/application/adminNotes/saveAdminNotes";
import { captureAppPermission } from "@/core/application/appPermission/captureAppPermission";
import { saveAppPermission } from "@/core/application/appPermission/saveAppPermission";
import type { CaptureAllContainers } from "@/core/application/container/captureAll";
import { captureCustomization } from "@/core/application/customization/captureCustomization";
import { saveCustomization } from "@/core/application/customization/saveCustomization";
import {
  isForbiddenError,
  isSystemError,
  isUnauthenticatedError,
  SystemError,
  SystemErrorCode,
} from "@/core/application/error";
import { captureFieldPermission } from "@/core/application/fieldPermission/captureFieldPermission";
import { saveFieldPermission } from "@/core/application/fieldPermission/saveFieldPermission";
import { captureSchema } from "@/core/application/formSchema/captureSchema";
import { saveSchema } from "@/core/application/formSchema/saveSchema";
import { captureGeneralSettings } from "@/core/application/generalSettings/captureGeneralSettings";
import { saveGeneralSettings } from "@/core/application/generalSettings/saveGeneralSettings";
import { captureNotification } from "@/core/application/notification/captureNotification";
import { saveNotification } from "@/core/application/notification/saveNotification";
import { capturePlugin } from "@/core/application/plugin/capturePlugin";
import { savePlugin } from "@/core/application/plugin/savePlugin";
import { captureProcessManagement } from "@/core/application/processManagement/captureProcessManagement";
import { saveProcessManagement } from "@/core/application/processManagement/saveProcessManagement";
import { captureRecordPermission } from "@/core/application/recordPermission/captureRecordPermission";
import { saveRecordPermission } from "@/core/application/recordPermission/saveRecordPermission";
import { captureReport } from "@/core/application/report/captureReport";
import { saveReport } from "@/core/application/report/saveReport";
import { captureSeed } from "@/core/application/seedData/captureSeed";
import { saveSeed } from "@/core/application/seedData/saveSeed";
import { captureView } from "@/core/application/view/captureView";
import { saveView } from "@/core/application/view/saveView";

export type { CaptureAllContainers } from "@/core/application/container/captureAll";

export type CaptureDomain =
  | "customize"
  | "schema"
  | "seed"
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

export type CaptureResult =
  | Readonly<{ domain: CaptureDomain; success: true }>
  | Readonly<{ domain: CaptureDomain; success: false; error: unknown }>;

export type CaptureAllForAppInput = Readonly<{
  appName: string;
  customizeFilePath: string;
  containers: CaptureAllContainers;
}>;

type CaptureTask = {
  readonly domain: CaptureDomain;
  readonly run: () => Promise<void>;
};

function buildStandardTask<C>(
  domain: CaptureDomain,
  container: C,
  capture: (c: C) => Promise<{ configText: string }>,
  save: (c: C, text: string) => Promise<void>,
): CaptureTask {
  return {
    domain,
    run: async () => {
      const result = await capture(container);
      await save(container, result.configText);
    },
  };
}

function buildCaptureTasks(
  input: CaptureAllForAppInput,
): readonly CaptureTask[] {
  const c = input.containers;

  return [
    {
      domain: "customize",
      run: async () => {
        const basePath = dirname(resolve(input.customizeFilePath));
        const result = await captureCustomization({
          container: c.customization,
          input: { basePath, filePrefix: input.appName },
        });
        await saveCustomization({
          container: c.customization,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "schema",
      run: async () => {
        const result = await captureSchema({ container: c.schema });
        await saveSchema({
          container: c.schema,
          input: { schemaText: result.schemaText },
        });
      },
    },
    {
      // During init, seed is captured without an upsert key because the key
      // field is unknown at this point. Users can add keyField later when
      // they configure upsert-based seed application.
      domain: "seed",
      run: async () => {
        const result = await captureSeed({ container: c.seed, input: {} });
        await saveSeed({
          container: c.seed,
          input: { seedText: result.seedText },
        });
      },
    },
    buildStandardTask(
      "view",
      c.view,
      (v) => captureView({ container: v }),
      (v, text) => saveView({ container: v, input: { configText: text } }),
    ),
    buildStandardTask(
      "settings",
      c.settings,
      (s) => captureGeneralSettings({ container: s }),
      (s, text) =>
        saveGeneralSettings({ container: s, input: { configText: text } }),
    ),
    buildStandardTask(
      "notification",
      c.notification,
      (n) => captureNotification({ container: n }),
      (n, text) =>
        saveNotification({ container: n, input: { configText: text } }),
    ),
    buildStandardTask(
      "report",
      c.report,
      (r) => captureReport({ container: r }),
      (r, text) => saveReport({ container: r, input: { configText: text } }),
    ),
    buildStandardTask(
      "action",
      c.action,
      (a) => captureAction({ container: a }),
      (a, text) => saveAction({ container: a, input: { configText: text } }),
    ),
    buildStandardTask(
      "process",
      c.process,
      (p) => captureProcessManagement({ container: p }),
      (p, text) =>
        saveProcessManagement({ container: p, input: { configText: text } }),
    ),
    buildStandardTask(
      "field-acl",
      c.fieldPermission,
      (f) => captureFieldPermission({ container: f }),
      (f, text) =>
        saveFieldPermission({ container: f, input: { configText: text } }),
    ),
    buildStandardTask(
      "app-acl",
      c.appPermission,
      (a) => captureAppPermission({ container: a }),
      (a, text) =>
        saveAppPermission({ container: a, input: { configText: text } }),
    ),
    buildStandardTask(
      "record-acl",
      c.recordPermission,
      (r) => captureRecordPermission({ container: r }),
      (r, text) =>
        saveRecordPermission({ container: r, input: { configText: text } }),
    ),
    buildStandardTask(
      "admin-notes",
      c.adminNotes,
      (a) => captureAdminNotes({ container: a }),
      (a, text) =>
        saveAdminNotes({ container: a, input: { configText: text } }),
    ),
    buildStandardTask(
      "plugin",
      c.plugin,
      (p) => capturePlugin({ container: p }),
      (p, text) => savePlugin({ container: p, input: { configText: text } }),
    ),
  ];
}

export function isFatalError(error: unknown): boolean {
  if (isUnauthenticatedError(error)) return true;
  if (isForbiddenError(error)) return true;
  if (isSystemError(error) && error.code === SystemErrorCode.NetworkError) {
    return true;
  }
  return false;
}

export async function captureAllForApp(
  input: CaptureAllForAppInput,
): Promise<readonly CaptureResult[]> {
  const tasks = buildCaptureTasks(input);
  const results: CaptureResult[] = [];

  // NOTE: This orchestration function intentionally uses try-catch to record partial
  // failures per domain and continue with remaining domains, deviating from the
  // project convention of avoiding try-catch in the application layer.
  for (const [i, task] of tasks.entries()) {
    try {
      await task.run();
      results.push({ domain: task.domain, success: true });
    } catch (error) {
      results.push({ domain: task.domain, success: false, error });
      if (isFatalError(error)) {
        const skipError = new SystemError(
          SystemErrorCode.ExternalApiError,
          `Skipped due to fatal error in "${task.domain}"`,
          error,
        );
        for (const remaining of tasks.slice(i + 1)) {
          results.push({
            domain: remaining.domain,
            success: false,
            error: skipError,
          });
        }
        break;
      }
    }
  }

  return results;
}
