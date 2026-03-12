import { applyFromConfig } from "../applyFromConfigBase";
import type { FieldPermissionServiceArgs } from "../container/fieldPermission";
import { parseFieldPermissionConfigText } from "./parseConfig";

export async function applyFieldPermission({
  container,
}: FieldPermissionServiceArgs): Promise<void> {
  await applyFromConfig({
    getStorage: () => container.fieldPermissionStorage.get(),
    parseConfig: (content) =>
      parseFieldPermissionConfigText(container.configCodec, content),
    fetchRemote: () =>
      container.fieldPermissionConfigurator.getFieldPermissions(),
    update: async (config, current) => {
      await container.fieldPermissionConfigurator.updateFieldPermissions({
        rights: config.rights,
        revision: current.revision,
      });
    },
    notFoundMessage: "Field permission config file not found",
  });
}
