import type { CustomizationCliContainerConfig } from "@/core/application/container/cli";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

export const customizeArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "customize-file": {
    type: "string" as const,
    description: "Customization config file path (default: customize.yaml)",
  },
};

export type CustomizeCliValues = MultiAppCliValues & {
  "customize-file"?: string;
};

const {
  resolveFilePath: resolveCustomizeFilePath,
  resolveContainerConfig: resolveCustomizeConfig,
  resolveAppContainerConfig: resolveCustomizeAppConfig,
} = createDomainConfigResolver({
  fileArgKey: "customize-file",
  envVar: () => process.env.CUSTOMIZE_FILE_PATH,
  appFileField: (a) => a.customizeFile,
  defaultDir: "customize",
  defaultFileName: "customize.yaml",
  buildConfig: (base, filePath): CustomizationCliContainerConfig => ({
    ...base,
    customizeFilePath: filePath,
  }),
});

export {
  resolveCustomizeFilePath,
  resolveCustomizeConfig,
  resolveCustomizeAppConfig,
};
