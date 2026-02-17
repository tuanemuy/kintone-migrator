import { dirname, resolve } from "node:path";
import { captureAction } from "@/core/application/action/captureAction";
import { saveAction } from "@/core/application/action/saveAction";
import { captureAdminNotes } from "@/core/application/adminNotes/captureAdminNotes";
import { saveAdminNotes } from "@/core/application/adminNotes/saveAdminNotes";
import { captureAppPermission } from "@/core/application/appPermission/captureAppPermission";
import { saveAppPermission } from "@/core/application/appPermission/saveAppPermission";
import {
  type ActionCliContainerConfig,
  createActionCliContainer,
} from "@/core/application/container/actionCli";
import {
  type AdminNotesCliContainerConfig,
  createAdminNotesCliContainer,
} from "@/core/application/container/adminNotesCli";
import {
  type AppPermissionCliContainerConfig,
  createAppPermissionCliContainer,
} from "@/core/application/container/appPermissionCli";
import type { KintoneAuth } from "@/core/application/container/cli";
import {
  type CliContainerConfig,
  type CustomizationCliContainerConfig,
  createCliContainer,
  createCustomizationCliContainer,
  createSeedCliContainer,
  type SeedCliContainerConfig,
} from "@/core/application/container/cli";
import {
  createFieldPermissionCliContainer,
  type FieldPermissionCliContainerConfig,
} from "@/core/application/container/fieldPermissionCli";
import {
  createGeneralSettingsCliContainer,
  type GeneralSettingsCliContainerConfig,
} from "@/core/application/container/generalSettingsCli";
import {
  createNotificationCliContainer,
  type NotificationCliContainerConfig,
} from "@/core/application/container/notification";
import {
  createPluginCliContainer,
  type PluginCliContainerConfig,
} from "@/core/application/container/pluginCli";
import {
  createProcessManagementCliContainer,
  type ProcessManagementCliContainerConfig,
} from "@/core/application/container/processManagementCli";
import {
  createRecordPermissionCliContainer,
  type RecordPermissionCliContainerConfig,
} from "@/core/application/container/recordPermissionCli";
import {
  createReportCliContainer,
  type ReportCliContainerConfig,
} from "@/core/application/container/reportCli";
import {
  createViewCliContainer,
  type ViewCliContainerConfig,
} from "@/core/application/container/viewCli";
import { captureCustomization } from "@/core/application/customization/captureCustomization";
import { saveCustomization } from "@/core/application/customization/saveCustomization";
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
import { buildAppFilePaths } from "./appFilePaths";

export type CaptureResult = Readonly<{
  domain: string;
  success: boolean;
  error?: unknown;
}>;

export type CaptureAllForAppInput = Readonly<{
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  appName: string;
}>;

type CaptureTask = {
  readonly domain: string;
  readonly run: () => Promise<void>;
};

function buildCaptureTasks(
  input: CaptureAllForAppInput,
): readonly CaptureTask[] {
  const base = {
    baseUrl: input.baseUrl,
    auth: input.auth,
    appId: input.appId,
    guestSpaceId: input.guestSpaceId,
  };

  const paths = buildAppFilePaths(input.appName);

  return [
    {
      domain: "customize",
      run: async () => {
        const config: CustomizationCliContainerConfig = {
          ...base,
          customizeFilePath: paths.customize,
        };
        const container = createCustomizationCliContainer(config);
        const basePath = dirname(resolve(paths.customize));
        const result = await captureCustomization({
          container,
          input: { basePath, filePrefix: input.appName },
        });
        await saveCustomization({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "schema",
      run: async () => {
        const config: CliContainerConfig = {
          ...base,
          schemaFilePath: paths.schema,
        };
        const container = createCliContainer(config);
        const result = await captureSchema({ container });
        await saveSchema({
          container,
          input: { schemaText: result.schemaText },
        });
      },
    },
    {
      domain: "seed",
      run: async () => {
        const config: SeedCliContainerConfig = {
          ...base,
          seedFilePath: paths.seed,
        };
        const container = createSeedCliContainer(config);
        const result = await captureSeed({
          container,
          input: {},
        });
        await saveSeed({
          container,
          input: { seedText: result.seedText },
        });
      },
    },
    {
      domain: "view",
      run: async () => {
        const config: ViewCliContainerConfig = {
          ...base,
          viewFilePath: paths.view,
        };
        const container = createViewCliContainer(config);
        const result = await captureView({ container });
        await saveView({ container, input: { configText: result.configText } });
      },
    },
    {
      domain: "settings",
      run: async () => {
        const config: GeneralSettingsCliContainerConfig = {
          ...base,
          settingsFilePath: paths.settings,
        };
        const container = createGeneralSettingsCliContainer(config);
        const result = await captureGeneralSettings({ container });
        await saveGeneralSettings({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "notification",
      run: async () => {
        const config: NotificationCliContainerConfig = {
          ...base,
          notificationFilePath: paths.notification,
        };
        const container = createNotificationCliContainer(config);
        const result = await captureNotification({ container });
        await saveNotification({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "report",
      run: async () => {
        const config: ReportCliContainerConfig = {
          ...base,
          reportFilePath: paths.report,
        };
        const container = createReportCliContainer(config);
        const result = await captureReport({ container });
        await saveReport({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "action",
      run: async () => {
        const config: ActionCliContainerConfig = {
          ...base,
          actionFilePath: paths.action,
        };
        const container = createActionCliContainer(config);
        const result = await captureAction({ container });
        await saveAction({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "process",
      run: async () => {
        const config: ProcessManagementCliContainerConfig = {
          ...base,
          processFilePath: paths.process,
        };
        const container = createProcessManagementCliContainer(config);
        const result = await captureProcessManagement({ container });
        await saveProcessManagement({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "field-acl",
      run: async () => {
        const config: FieldPermissionCliContainerConfig = {
          ...base,
          fieldAclFilePath: paths.fieldAcl,
        };
        const container = createFieldPermissionCliContainer(config);
        const result = await captureFieldPermission({ container });
        await saveFieldPermission({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "app-acl",
      run: async () => {
        const config: AppPermissionCliContainerConfig = {
          ...base,
          appAclFilePath: paths.appAcl,
        };
        const container = createAppPermissionCliContainer(config);
        const result = await captureAppPermission({ container });
        await saveAppPermission({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "record-acl",
      run: async () => {
        const config: RecordPermissionCliContainerConfig = {
          ...base,
          recordAclFilePath: paths.recordAcl,
        };
        const container = createRecordPermissionCliContainer(config);
        const result = await captureRecordPermission({ container });
        await saveRecordPermission({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "admin-notes",
      run: async () => {
        const config: AdminNotesCliContainerConfig = {
          ...base,
          adminNotesFilePath: paths.adminNotes,
        };
        const container = createAdminNotesCliContainer(config);
        const result = await captureAdminNotes({ container });
        await saveAdminNotes({
          container,
          input: { configText: result.configText },
        });
      },
    },
    {
      domain: "plugin",
      run: async () => {
        const config: PluginCliContainerConfig = {
          ...base,
          pluginFilePath: paths.plugin,
        };
        const container = createPluginCliContainer(config);
        const result = await capturePlugin({ container });
        await savePlugin({
          container,
          input: { configText: result.configText },
        });
      },
    },
  ];
}

export async function captureAllForApp(
  input: CaptureAllForAppInput,
): Promise<readonly CaptureResult[]> {
  const tasks = buildCaptureTasks(input);
  const results: CaptureResult[] = [];

  for (const task of tasks) {
    try {
      await task.run();
      results.push({ domain: task.domain, success: true });
    } catch (error) {
      results.push({ domain: task.domain, success: false, error });
    }
  }

  return results;
}
