import type { AdminNotesCliContainerConfig } from "@/core/application/container/adminNotesCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";

export const adminNotesArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "admin-notes-file": {
    type: "string" as const,
    description: "Admin notes file path (default: admin-notes.yaml)",
  },
};

export type AdminNotesCliValues = MultiAppCliValues & {
  "admin-notes-file"?: string;
};

export function resolveAdminNotesFilePath(
  cliValues: AdminNotesCliValues,
  app?: AppEntry,
): string {
  return (
    cliValues["admin-notes-file"] ??
    process.env.ADMIN_NOTES_FILE_PATH ??
    (app ? `admin-notes/${app.name}.yaml` : "admin-notes.yaml")
  );
}

export function resolveAdminNotesContainerConfig(
  cliValues: AdminNotesCliValues,
): AdminNotesCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    adminNotesFilePath: resolveAdminNotesFilePath(cliValues),
  };
}

export function resolveAdminNotesAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: AdminNotesCliValues,
): AdminNotesCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    adminNotesFilePath: resolveAdminNotesFilePath(cliValues, app),
  };
}
