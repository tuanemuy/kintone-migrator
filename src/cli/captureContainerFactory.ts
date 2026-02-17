import { createActionCliContainer } from "@/core/application/container/actionCli";
import { createAdminNotesCliContainer } from "@/core/application/container/adminNotesCli";
import { createAppPermissionCliContainer } from "@/core/application/container/appPermissionCli";
import type { CaptureAllContainers } from "@/core/application/container/captureAll";
import type { KintoneAuth } from "@/core/application/container/cli";
import {
  createCliContainer,
  createCustomizationCliContainer,
  createSeedCliContainer,
} from "@/core/application/container/cli";
import { createFieldPermissionCliContainer } from "@/core/application/container/fieldPermissionCli";
import { createGeneralSettingsCliContainer } from "@/core/application/container/generalSettingsCli";
import { createNotificationCliContainer } from "@/core/application/container/notification";
import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import { createProcessManagementCliContainer } from "@/core/application/container/processManagementCli";
import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import { createReportCliContainer } from "@/core/application/container/reportCli";
import { createViewCliContainer } from "@/core/application/container/viewCli";
import { buildAppFilePaths } from "@/core/domain/projectConfig/appFilePaths";

export type CreateCaptureContainersInput = Readonly<{
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  appName: string;
}>;

export function createCliCaptureContainers(
  input: CreateCaptureContainersInput,
): CaptureAllContainers {
  const base = {
    baseUrl: input.baseUrl,
    auth: input.auth,
    appId: input.appId,
    guestSpaceId: input.guestSpaceId,
  };
  const paths = buildAppFilePaths(input.appName);

  return {
    schema: createCliContainer({ ...base, schemaFilePath: paths.schema }),
    seed: createSeedCliContainer({ ...base, seedFilePath: paths.seed }),
    customization: createCustomizationCliContainer({
      ...base,
      customizeFilePath: paths.customize,
    }),
    view: createViewCliContainer({ ...base, viewFilePath: paths.view }),
    settings: createGeneralSettingsCliContainer({
      ...base,
      settingsFilePath: paths.settings,
    }),
    notification: createNotificationCliContainer({
      ...base,
      notificationFilePath: paths.notification,
    }),
    report: createReportCliContainer({ ...base, reportFilePath: paths.report }),
    action: createActionCliContainer({
      ...base,
      actionFilePath: paths.action,
    }),
    process: createProcessManagementCliContainer({
      ...base,
      processFilePath: paths.process,
    }),
    fieldPermission: createFieldPermissionCliContainer({
      ...base,
      fieldAclFilePath: paths.fieldAcl,
    }),
    appPermission: createAppPermissionCliContainer({
      ...base,
      appAclFilePath: paths.appAcl,
    }),
    recordPermission: createRecordPermissionCliContainer({
      ...base,
      recordAclFilePath: paths.recordAcl,
    }),
    adminNotes: createAdminNotesCliContainer({
      ...base,
      adminNotesFilePath: paths.adminNotes,
    }),
    plugin: createPluginCliContainer({
      ...base,
      pluginFilePath: paths.plugin,
    }),
  };
}
