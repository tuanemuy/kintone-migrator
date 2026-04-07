import {
  type AppFilePaths,
  buildAppFilePaths,
} from "@/core/domain/projectConfig/appFilePaths";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { createActionCliContainer } from "./actionCli";
import { createAdminNotesCliContainer } from "./adminNotesCli";
import type { ApplyAllContainers } from "./applyAll";
import { createAppPermissionCliContainer } from "./appPermissionCli";
import {
  createCliContainer,
  createCustomizationCliContainer,
  createSeedCliContainer,
  type KintoneAuth,
} from "./cli";
import type { DiffAllContainers } from "./diffAll";
import { createFieldPermissionCliContainer } from "./fieldPermissionCli";
import { createGeneralSettingsCliContainer } from "./generalSettingsCli";
import { createKintoneClient } from "./kintoneClient";
import { createNotificationCliContainer } from "./notificationCli";
import { createPluginCliContainer } from "./pluginCli";
import { createProcessManagementCliContainer } from "./processManagementCli";
import { createRecordPermissionCliContainer } from "./recordPermissionCli";
import { createReportCliContainer } from "./reportCli";
import { createViewCliContainer } from "./viewCli";

export type CreateApplyAllContainersInput = Readonly<{
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  appName: AppName;
  baseDir?: string;
}>;

export type CreateApplyAllContainersResult = Readonly<{
  containers: ApplyAllContainers;
  diffContainers: DiffAllContainers;
  paths: AppFilePaths;
}>;

export function createCliApplyAllContainers(
  input: CreateApplyAllContainersInput,
): CreateApplyAllContainersResult {
  const client = createKintoneClient(input);
  const base = {
    baseUrl: input.baseUrl,
    auth: input.auth,
    appId: input.appId,
    guestSpaceId: input.guestSpaceId,
    client,
  };
  const paths = buildAppFilePaths(input.appName, input.baseDir);

  const schema = createCliContainer({ ...base, schemaFilePath: paths.schema });
  const seed = createSeedCliContainer({ ...base, seedFilePath: paths.seed });
  const customization = createCustomizationCliContainer({
    ...base,
    customizeFilePath: paths.customize,
  });
  const view = createViewCliContainer({ ...base, viewFilePath: paths.view });
  const settings = createGeneralSettingsCliContainer({
    ...base,
    settingsFilePath: paths.settings,
  });
  const notification = createNotificationCliContainer({
    ...base,
    notificationFilePath: paths.notification,
  });
  const report = createReportCliContainer({
    ...base,
    reportFilePath: paths.report,
  });
  const action = createActionCliContainer({
    ...base,
    actionFilePath: paths.action,
  });
  const process = createProcessManagementCliContainer({
    ...base,
    processFilePath: paths.process,
  });
  const fieldPermission = createFieldPermissionCliContainer({
    ...base,
    fieldAclFilePath: paths.fieldAcl,
  });
  const appPermission = createAppPermissionCliContainer({
    ...base,
    appAclFilePath: paths.appAcl,
  });
  const recordPermission = createRecordPermissionCliContainer({
    ...base,
    recordAclFilePath: paths.recordAcl,
  });
  const adminNotes = createAdminNotesCliContainer({
    ...base,
    adminNotesFilePath: paths.adminNotes,
  });
  const plugin = createPluginCliContainer({
    ...base,
    pluginFilePath: paths.plugin,
  });

  const containers: ApplyAllContainers = {
    schema,
    seed,
    customization,
    view,
    settings,
    notification,
    report,
    action,
    process,
    fieldPermission,
    appPermission,
    recordPermission,
    adminNotes,
    plugin,
  };

  // DiffAllContainers uses the subset (diff-only) types, which are satisfied
  // by the full container types above.
  const diffContainers: DiffAllContainers = {
    schema,
    customization,
    view,
    settings,
    notification,
    report,
    action,
    process,
    fieldPermission,
    appPermission,
    recordPermission,
    adminNotes,
    plugin,
  };

  return { containers, diffContainers, paths };
}
