import { stringify as stringifyYaml } from "yaml";
import type { ProcessManagementConfig } from "../entity";
import type { ProcessEntity } from "../valueObject";

function serializeProcessEntity(
  entity: ProcessEntity,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: entity.type,
  };

  if (entity.code !== undefined) {
    result.code = entity.code;
  }

  if (entity.includeSubs !== undefined) {
    result.includeSubs = entity.includeSubs;
  }

  return result;
}

export const ProcessManagementConfigSerializer = {
  serialize: (config: ProcessManagementConfig): string => {
    const serializedStates: Record<string, unknown> = {};

    for (const [name, state] of Object.entries(config.states)) {
      serializedStates[name] = {
        index: state.index,
        assignee: {
          type: state.assignee.type,
          entities: state.assignee.entities.map(serializeProcessEntity),
        },
      };
    }

    const serialized: Record<string, unknown> = {
      enable: config.enable,
      states: serializedStates,
      actions: config.actions.map((action) => {
        const serializedAction: Record<string, unknown> = {
          name: action.name,
          from: action.from,
          to: action.to,
          filterCond: action.filterCond,
          type: action.type,
        };

        if (action.executableUser !== undefined) {
          serializedAction.executableUser = {
            entities: action.executableUser.entities.map(
              serializeProcessEntity,
            ),
          };
        }

        return serializedAction;
      }),
    };

    return stringifyYaml(serialized, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
