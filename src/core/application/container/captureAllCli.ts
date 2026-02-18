import {
  type AppFilePaths,
  buildAppFilePaths,
} from "@/core/domain/projectConfig/appFilePaths";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { createActionCliContainer } from "./actionCli";
import { createAdminNotesCliContainer } from "./adminNotesCli";
import { createAppPermissionCliContainer } from "./appPermissionCli";
import type { CaptureAllContainers } from "./captureAll";
import {
  createCliContainer,
  createCustomizationCliContainer,
  createSeedCliContainer,
  type KintoneAuth,
} from "./cli";
import { createFieldPermissionCliContainer } from "./fieldPermissionCli";
import { createGeneralSettingsCliContainer } from "./generalSettingsCli";
import { createNotificationCliContainer } from "./notificationCli";
import { createPluginCliContainer } from "./pluginCli";
import { createProcessManagementCliContainer } from "./processManagementCli";
import { createRecordPermissionCliContainer } from "./recordPermissionCli";
import { createReportCliContainer } from "./reportCli";
import { createViewCliContainer } from "./viewCli";

export type CreateCaptureContainersInput = Readonly<{
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  appName: AppName;
}>;

export type CreateCaptureContainersResult = Readonly<{
  containers: CaptureAllContainers;
  paths: AppFilePaths;
}>;

export function createCliCaptureContainers(
  input: CreateCaptureContainersInput,
): CreateCaptureContainersResult {
  const base = {
    baseUrl: input.baseUrl,
    auth: input.auth,
    appId: input.appId,
    guestSpaceId: input.guestSpaceId,
  };
  const paths = buildAppFilePaths(input.appName);

  return {
    paths,
    containers: {
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
      report: createReportCliContainer({
        ...base,
        reportFilePath: paths.report,
      }),
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
    },
  };
}
