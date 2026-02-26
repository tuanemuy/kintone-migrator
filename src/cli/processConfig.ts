import type { ProcessManagementCliContainerConfig } from "@/core/application/container/processManagementCli";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

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
  buildConfig: (base, filePath): ProcessManagementCliContainerConfig => ({
    ...base,
    processFilePath: filePath,
  }),
});

export {
  resolveProcessFilePath,
  resolveProcessContainerConfig,
  resolveProcessAppContainerConfig,
};
