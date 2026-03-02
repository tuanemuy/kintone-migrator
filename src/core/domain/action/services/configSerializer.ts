import { serializeToYaml } from "@/core/domain/services/yamlConfigSerializer";
import type { ActionConfig, ActionsConfig } from "../entity";
import type { ActionEntity, ActionMapping } from "../valueObject";

function serializeDestApp(
  destApp: ActionConfig["destApp"],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (destApp.code !== undefined) {
    result.code = destApp.code;
  }

  if (destApp.app !== undefined) {
    result.app = destApp.app;
  }

  return result;
}

function serializeMapping(mapping: ActionMapping): Record<string, unknown> {
  const result: Record<string, unknown> = {
    srcType: mapping.srcType,
    destField: mapping.destField,
  };

  if (mapping.srcField !== undefined) {
    result.srcField = mapping.srcField;
  }

  return result;
}

function serializeEntity(entity: ActionEntity): Record<string, unknown> {
  return {
    type: entity.type,
    code: entity.code,
  };
}

function serializeActionConfig(config: ActionConfig): Record<string, unknown> {
  return {
    index: config.index,
    destApp: serializeDestApp(config.destApp),
    mappings: config.mappings.map(serializeMapping),
    entities: config.entities.map(serializeEntity),
    filterCond: config.filterCond,
  };
}

export const ActionConfigSerializer = {
  serialize: (config: ActionsConfig): string => {
    const serialized: Record<string, unknown> = {};
    const actions: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config.actions)) {
      actions[key] = serializeActionConfig(value);
    }

    serialized.actions = actions;

    return serializeToYaml(serialized);
  },
};
