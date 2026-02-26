import type { AdminNotesCliContainerConfig } from "@/core/application/container/adminNotesCli";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

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
  buildConfig: (base, filePath): AdminNotesCliContainerConfig => ({
    ...base,
    adminNotesFilePath: filePath,
  }),
});

export {
  resolveAdminNotesFilePath,
  resolveAdminNotesContainerConfig,
  resolveAdminNotesAppContainerConfig,
};
