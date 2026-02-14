import { stringify as stringifyYaml } from "yaml";
import type { FieldPermissionConfig } from "../entity";
import type { FieldRightEntity } from "../valueObject";

function serializeFieldRightEntity(
  entity: FieldRightEntity,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    accessibility: entity.accessibility,
    entity: {
      type: entity.entity.type,
      code: entity.entity.code,
    },
  };

  if (entity.includeSubs !== undefined) {
    result.includeSubs = entity.includeSubs;
  }

  return result;
}

export const FieldPermissionConfigSerializer = {
  serialize: (config: FieldPermissionConfig): string => {
    const serialized = {
      rights: config.rights.map((right) => ({
        code: right.code,
        entities: right.entities.map(serializeFieldRightEntity),
      })),
    };

    return stringifyYaml(serialized, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
