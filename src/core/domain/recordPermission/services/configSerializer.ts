import { serializeToYaml } from "@/core/domain/services/yamlConfigSerializer";
import type { RecordPermissionConfig } from "../entity";
import type { RecordPermissionRightEntity } from "../valueObject";

function serializeRecordRightEntity(
  entity: RecordPermissionRightEntity,
): Record<string, unknown> {
  return {
    entity: {
      type: entity.entity.type,
      code: entity.entity.code,
    },
    viewable: entity.viewable,
    editable: entity.editable,
    deletable: entity.deletable,
    includeSubs: entity.includeSubs,
  };
}

export const RecordPermissionConfigSerializer = {
  serialize: (config: RecordPermissionConfig): string => {
    const serialized = {
      rights: config.rights.map((right) => ({
        filterCond: right.filterCond,
        entities: right.entities.map(serializeRecordRightEntity),
      })),
    };

    return serializeToYaml(serialized);
  },
};
