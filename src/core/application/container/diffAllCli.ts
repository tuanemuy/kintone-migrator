import {
  type AppFilePaths,
  buildAppFilePaths,
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { createActionCliContainer } from "./actionCli";
import { createAdminNotesCliContainer } from "./adminNotesCli";
import { createAppPermissionCliContainer } from "./appPermissionCli";
import {
  createCliContainer,
  createCustomizationCliContainer,
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

export type CreateDiffAllContainersInput = Readonly<{
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  appName: AppName;
  baseDir?: string;
}>;

export type CreateDiffAllContainersResult = Readonly<{
  containers: DiffAllContainers;
  paths: AppFilePaths;
}>;

export function createCliDiffAllContainers(
  input: CreateDiffAllContainersInput,
): CreateDiffAllContainersResult {
  const client = createKintoneClient(input);
  const base = {
    baseUrl: input.baseUrl,
    auth: input.auth,
    appId: input.appId,
    guestSpaceId: input.guestSpaceId,
    client,
  };
  const paths = buildAppFilePaths(input.appName, input.baseDir);

  return {
    paths,
    containers: {
      schema: createCliContainer({
        ...base,
        schemaFilePath: paths.schema,
        stateSchemaFilePath: buildStateFilePath(input.appName, input.baseDir),
        appRevisionFilePath: buildAppRevisionFilePath(
          input.appName,
          input.baseDir,
        ),
      }),
      customization: createCustomizationCliContainer({
        ...base,
        customizeFilePath: paths.customize,
      }),
      view: createViewCliContainer({
        ...base,
        viewFilePath: paths.view,
        viewStateFilePath: buildDomainStateFilePath(
          input.appName,
          "view.yaml",
          input.baseDir,
        ),
        appRevisionFilePath: buildAppRevisionFilePath(
          input.appName,
          input.baseDir,
        ),
      }),
      settings: createGeneralSettingsCliContainer({
        ...base,
        settingsFilePath: paths.settings,
        settingsStateFilePath: buildDomainStateFilePath(
          input.appName,
          "settings.yaml",
          input.baseDir,
        ),
        appRevisionFilePath: buildAppRevisionFilePath(
          input.appName,
          input.baseDir,
        ),
      }),
      notification: createNotificationCliContainer({
        ...base,
        notificationFilePath: paths.notification,
        notificationStateFilePath: buildDomainStateFilePath(
          input.appName,
          "notification.yaml",
          input.baseDir,
        ),
        appRevisionFilePath: buildAppRevisionFilePath(
          input.appName,
          input.baseDir,
        ),
      }),
      report: createReportCliContainer({
        ...base,
        reportFilePath: paths.report,
        reportStateFilePath: buildDomainStateFilePath(
          input.appName,
          "report.yaml",
          input.baseDir,
        ),
        appRevisionFilePath: buildAppRevisionFilePath(
          input.appName,
          input.baseDir,
        ),
      }),
      action: createActionCliContainer({
        ...base,
        actionFilePath: paths.action,
        actionStateFilePath: buildDomainStateFilePath(
          input.appName,
          "action.yaml",
          input.baseDir,
        ),
        appRevisionFilePath: buildAppRevisionFilePath(
          input.appName,
          input.baseDir,
        ),
      }),
      process: createProcessManagementCliContainer({
        ...base,
        processFilePath: paths.process,
        processStateFilePath: buildDomainStateFilePath(
          input.appName,
          "process.yaml",
          input.baseDir,
        ),
        appRevisionFilePath: buildAppRevisionFilePath(
          input.appName,
          input.baseDir,
        ),
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
        adminNotesStateFilePath: buildDomainStateFilePath(
          input.appName,
          "admin-notes.yaml",
          input.baseDir,
        ),
        appRevisionFilePath: buildAppRevisionFilePath(
          input.appName,
          input.baseDir,
        ),
      }),
      plugin: createPluginCliContainer({
        ...base,
        pluginFilePath: paths.plugin,
      }),
    },
  };
}
