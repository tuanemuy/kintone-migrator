import type { ProcessManagementCliContainerConfig } from "@/core/application/container/processManagementCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const PROCESS_STATE_FILE = "process.yaml";

export const processArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "process-file": {
    type: "string" as const,
    description: "Process management file path (default: process.yaml)",
  },
};

export type ProcessCliValues = MultiAppCliValues & {
  "process-file"?: string;
};

const {
  resolveFilePath: resolveProcessFilePath,
  resolveContainerConfig: resolveProcessContainerConfig,
  resolveAppContainerConfig: resolveProcessAppContainerConfig,
} = createDomainConfigResolver({
  fileArgKey: "process-file",
  envVar: () => process.env.PROCESS_FILE_PATH,
  appFileField: (a) => a.processFile,
  defaultDir: "process",
  defaultFileName: "process.yaml",
  buildConfig: (base, filePath, app): ProcessManagementCliContainerConfig => ({
    ...base,
    processFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode
    // (ADR-188-001).
    processStateFilePath: app
      ? buildDomainStateFilePath(app.name, PROCESS_STATE_FILE)
      : buildLegacyDomainStateFilePath(PROCESS_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveProcessFilePath,
  resolveProcessContainerConfig,
  resolveProcessAppContainerConfig,
};
