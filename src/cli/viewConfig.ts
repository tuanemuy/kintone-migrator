import type { ViewCliContainerConfig } from "@/core/application/container/viewCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const VIEW_STATE_FILE = "view.yaml";

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
  buildConfig: (base, filePath, app): ViewCliContainerConfig => ({
    ...base,
    viewFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    viewStateFilePath: app
      ? buildDomainStateFilePath(app.name, VIEW_STATE_FILE)
      : buildLegacyDomainStateFilePath(VIEW_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveViewFilePath,
  resolveViewContainerConfig,
  resolveViewAppContainerConfig,
};
