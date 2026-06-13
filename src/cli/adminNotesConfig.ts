import type { AdminNotesCliContainerConfig } from "@/core/application/container/adminNotesCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const ADMIN_NOTES_STATE_FILE = "admin-notes.yaml";

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

const {
  resolveFilePath: resolveAdminNotesFilePath,
  resolveContainerConfig: resolveAdminNotesContainerConfig,
  resolveAppContainerConfig: resolveAdminNotesAppContainerConfig,
} = createDomainConfigResolver({
  fileArgKey: "admin-notes-file",
  envVar: () => process.env.ADMIN_NOTES_FILE_PATH,
  appFileField: (a) => a.adminNotesFile,
  defaultDir: "admin-notes",
  defaultFileName: "admin-notes.yaml",
  buildConfig: (base, filePath, app): AdminNotesCliContainerConfig => ({
    ...base,
    adminNotesFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    adminNotesStateFilePath: app
      ? buildDomainStateFilePath(app.name, ADMIN_NOTES_STATE_FILE)
      : buildLegacyDomainStateFilePath(ADMIN_NOTES_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveAdminNotesFilePath,
  resolveAdminNotesContainerConfig,
  resolveAdminNotesAppContainerConfig,
};
