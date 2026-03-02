import { serializeToYaml } from "@/core/domain/services/yamlConfigSerializer";
import type { AppPermissionConfig, AppRight } from "../entity";

function serializeAppRight(right: AppRight): Record<string, unknown> {
  return {
    entity: {
      type: right.entity.type,
      code: right.entity.code,
    },
    includeSubs: right.includeSubs,
    appEditable: right.appEditable,
    recordViewable: right.recordViewable,
    recordAddable: right.recordAddable,
    recordEditable: right.recordEditable,
    recordDeletable: right.recordDeletable,
    recordImportable: right.recordImportable,
    recordExportable: right.recordExportable,
  };
}

export const AppPermissionConfigSerializer = {
  serialize: (config: AppPermissionConfig): string => {
    const serialized = {
      rights: config.rights.map(serializeAppRight),
    };

    return serializeToYaml(serialized);
  },
};
