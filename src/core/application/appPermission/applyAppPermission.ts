import { applyFromConfig } from "../applyFromConfigBase";
import type { AppPermissionServiceArgs } from "../container/appPermission";
import { parseAppPermissionConfigText } from "./parseConfig";

export async function applyAppPermission({
  container,
}: AppPermissionServiceArgs): Promise<void> {
  await applyFromConfig({
    getStorage: () => container.appPermissionStorage.get(),
    parseConfig: parseAppPermissionConfigText,
    fetchRemote: () => container.appPermissionConfigurator.getAppPermissions(),
    update: async (config, current) => {
      await container.appPermissionConfigurator.updateAppPermissions({
        rights: config.rights,
        revision: current.revision,
      });
    },
    notFoundMessage: "App permission config file not found",
  });
}
