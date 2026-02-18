import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type {
  ProcessManagementConfig,
  ProcessState,
} from "@/core/domain/processManagement/entity";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";
import type {
  ProcessAction,
  ProcessActionType,
  ProcessAssignee,
  ProcessAssigneeType,
  ProcessEntity,
  ProcessEntityType,
} from "@/core/domain/processManagement/valueObject";

const VALID_ASSIGNEE_TYPES: ReadonlySet<string> = new Set([
  "ONE",
  "ALL",
  "ANY",
]);
const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "USER",
  "GROUP",
  "ORGANIZATION",
  "FIELD_ENTITY",
  "CREATOR",
  "CUSTOM_FIELD",
]);
const VALID_ACTION_TYPES: ReadonlySet<string> = new Set([
  "PRIMARY",
  "SECONDARY",
]);

type KintoneProcessEntity = {
  entity: {
    type: string;
    code?: string;
  };
  includeSubs?: boolean;
};

type KintoneProcessState = {
  index: string | number;
  assignee: {
    type: string;
    entities: KintoneProcessEntity[];
  };
};

type KintoneProcessAction = {
  name: string;
  from: string;
  to: string;
  filterCond?: string;
  type?: string;
  executableUser?: {
    entities: KintoneProcessEntity[];
  };
};

function fromKintoneEntity(raw: KintoneProcessEntity): ProcessEntity {
  if (!VALID_ENTITY_TYPES.has(raw.entity.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected entity type from kintone API: ${raw.entity.type}`,
    );
  }

  const result: ProcessEntity = {
    type: raw.entity.type as ProcessEntityType,
  };

  const withCode =
    raw.entity.code !== undefined
      ? { ...result, code: raw.entity.code }
      : result;

  if (raw.includeSubs !== undefined) {
    return { ...withCode, includeSubs: raw.includeSubs };
  }

  return withCode;
}

function fromKintoneAssignee(
  raw: KintoneProcessState["assignee"],
): ProcessAssignee {
  if (!VALID_ASSIGNEE_TYPES.has(raw.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected assignee type from kintone API: ${raw.type}`,
    );
  }

  return {
    type: raw.type as ProcessAssigneeType,
    entities: raw.entities.map(fromKintoneEntity),
  };
}

function fromKintoneState(raw: KintoneProcessState): ProcessState {
  return {
    index: typeof raw.index === "string" ? Number(raw.index) : raw.index,
    assignee: fromKintoneAssignee(raw.assignee),
  };
}

function fromKintoneAction(raw: KintoneProcessAction): ProcessAction {
  if (raw.type !== undefined && !VALID_ACTION_TYPES.has(raw.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected action type from kintone API: ${raw.type}`,
    );
  }

  const actionType: ProcessActionType =
    raw.type !== undefined ? (raw.type as ProcessActionType) : "PRIMARY";

  const result: ProcessAction = {
    name: raw.name,
    from: raw.from,
    to: raw.to,
    filterCond: raw.filterCond ?? "",
    type: actionType,
  };

  if (
    actionType === "SECONDARY" &&
    raw.executableUser?.entities !== undefined
  ) {
    return {
      ...result,
      executableUser: {
        entities: raw.executableUser.entities.map(fromKintoneEntity),
      },
    };
  }

  return result;
}

function toKintoneEntity(entity: ProcessEntity): Record<string, unknown> {
  const result: Record<string, unknown> = {
    entity: {
      type: entity.type,
      ...(entity.code !== undefined ? { code: entity.code } : {}),
    },
  };

  if (entity.includeSubs !== undefined) {
    result.includeSubs = entity.includeSubs;
  }

  return result;
}

function toKintoneState(
  name: string,
  state: ProcessState,
): Record<string, unknown> {
  return {
    name,
    index: String(state.index),
    assignee: {
      type: state.assignee.type,
      entities: state.assignee.entities.map(toKintoneEntity),
    },
  };
}

function toKintoneAction(action: ProcessAction): Record<string, unknown> {
  const result: Record<string, unknown> = {
    name: action.name,
    from: action.from,
    to: action.to,
    filterCond: action.filterCond,
    type: action.type,
  };

  if (action.executableUser !== undefined) {
    result.executableUser = {
      entities: action.executableUser.entities.map(toKintoneEntity),
    };
  }

  return result;
}

export class KintoneProcessManagementConfigurator
  implements ProcessManagementConfigurator
{
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    revision: string;
  }> {
    try {
      const response = await this.client.app.getProcessManagement({
        app: this.appId,
        preview: true,
      });

      const enable = Boolean(response.enable);

      const rawStates = (response.states ?? {}) as Record<
        string,
        KintoneProcessState
      >;
      const states: Record<string, ProcessState> = {};
      for (const [name, rawState] of Object.entries(rawStates)) {
        states[name] = fromKintoneState(rawState);
      }

      const rawActions = (response.actions ?? []) as KintoneProcessAction[];
      const actions = rawActions.map(fromKintoneAction);

      return {
        config: { enable, states, actions },
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get process management settings",
        error,
      );
    }
  }

  async updateProcessManagement(params: {
    config: ProcessManagementConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const statesObj: Record<string, Record<string, unknown>> = {};
      for (const [name, state] of Object.entries(params.config.states)) {
        statesObj[name] = toKintoneState(name, state);
      }

      const requestParams: Record<string, unknown> = {
        app: this.appId,
        enable: params.config.enable,
        states: statesObj,
        actions: params.config.actions.map(toKintoneAction),
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateProcessManagement(
        requestParams as Parameters<
          typeof this.client.app.updateProcessManagement
        >[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update process management settings",
        error,
      );
    }
  }
}
