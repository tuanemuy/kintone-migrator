import type { AdminNotesCliContainerConfig } from "@/core/application/container/adminNotesCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

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
  return resolveFilePath({
    cliValue: cliValues["admin-notes-file"],
    envVar: process.env.ADMIN_NOTES_FILE_PATH,
    appFileField: (a) => a.adminNotesFile,
    app,
    defaultDir: "admin-notes",
    defaultFileName: "admin-notes.yaml",
  });
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
