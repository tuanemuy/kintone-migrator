import type { ViewCliContainerConfig } from "@/core/application/container/viewCli";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

export const viewArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "view-file": {
    type: "string" as const,
    description: "View file path (default: views.yaml)",
  },
};

export type ViewCliValues = MultiAppCliValues & {
  "view-file"?: string;
};

const {
  resolveFilePath: resolveViewFilePath,
  resolveContainerConfig: resolveViewContainerConfig,
  resolveAppContainerConfig: resolveViewAppContainerConfig,
} = createDomainConfigResolver({
  fileArgKey: "view-file",
  envVar: () => process.env.VIEW_FILE_PATH,
  appFileField: (a) => a.viewFile,
  defaultDir: "view",
  defaultFileName: "views.yaml",
  buildConfig: (base, filePath): ViewCliContainerConfig => ({
    ...base,
    viewFilePath: filePath,
  }),
});

export {
  resolveViewFilePath,
  resolveViewContainerConfig,
  resolveViewAppContainerConfig,
};
