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
} = createDomainConfigResolver<
  "customize-file",
  "customizeFilePath",
  CustomizeCliValues
>({
  fileArgKey: "customize-file",
  envVar: () => process.env.CUSTOMIZE_FILE_PATH,
  appFileField: (a) => a.customizeFile,
  defaultDir: "customize",
  defaultFileName: "customize.yaml",
  filePathKey: "customizeFilePath",
});

export {
  resolveCustomizeFilePath,
  resolveCustomizeConfig,
  resolveCustomizeAppConfig,
};
