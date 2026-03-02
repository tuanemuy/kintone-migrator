import { applyFromConfig } from "../applyFromConfigBase";
import type { RecordPermissionServiceArgs } from "../container/recordPermission";
import { parseRecordPermissionConfigText } from "./parseConfig";

export async function applyRecordPermission({
  container,
}: RecordPermissionServiceArgs): Promise<void> {
  await applyFromConfig({
    getStorage: () => container.recordPermissionStorage.get(),
    parseConfig: parseRecordPermissionConfigText,
    fetchRemote: () =>
      container.recordPermissionConfigurator.getRecordPermissions(),
    update: async (config, current) => {
      await container.recordPermissionConfigurator.updateRecordPermissions({
        rights: config.rights,
        revision: current.revision,
      });
    },
    notFoundMessage: "Record permission config file not found",
  });
}
