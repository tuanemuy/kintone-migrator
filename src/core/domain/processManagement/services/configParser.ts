import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import {
  isRecord,
  parseEnum,
  parseStrictBoolean,
} from "@/core/domain/typeGuards";
import type { ProcessManagementConfig, ProcessState } from "../entity";
import { ProcessManagementErrorCode } from "../errorCode";
import type {
  ProcessAction,
  ProcessActionType,
  ProcessAssignee,
  ProcessAssigneeType,
  ProcessEntity,
  ProcessEntityType,
} from "../valueObject";

const VALID_ASSIGNEE_TYPES: ReadonlySet<ProcessAssigneeType> =
  new Set<ProcessAssigneeType>(["ONE", "ALL", "ANY"]);
const VALID_ENTITY_TYPES: ReadonlySet<ProcessEntityType> =
  new Set<ProcessEntityType>([
    "USER",
    "GROUP",
    "ORGANIZATION",
    "FIELD_ENTITY",
    "CREATOR",
    "CUSTOM_FIELD",
  ]);
const VALID_ACTION_TYPES: ReadonlySet<ProcessActionType> =
  new Set<ProcessActionType>(["PRIMARY", "SECONDARY"]);

function parseProcessEntity(raw: unknown, index: number): ProcessEntity {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Entity at index ${index} must be an object`,
    );
  }

  const result: ProcessEntity = {
    type: parseEnum<ProcessEntityType>(
      raw.type,
      VALID_ENTITY_TYPES,
      ProcessManagementErrorCode.PmInvalidEntityType,
      `Entity at index ${index} has invalid type: ${String(raw.type)}. Must be USER, GROUP, ORGANIZATION, FIELD_ENTITY, CREATOR, or CUSTOM_FIELD`,
    ),
  };

  const withCode =
    raw.code !== undefined && raw.code !== null
      ? { ...result, code: String(raw.code) }
      : result;

  if (raw.includeSubs !== undefined && raw.includeSubs !== null) {
    return {
      ...withCode,
      includeSubs: parseStrictBoolean(
        raw.includeSubs,
        "includeSubs",
        `Entity at index ${index}`,
        ProcessManagementErrorCode.PmInvalidBooleanField,
      ),
    };
  }

  return withCode;
}

function parseAssignee(raw: unknown, stateName: string): ProcessAssignee {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Assignee for state "${stateName}" must be an object`,
    );
  }

  if (!Array.isArray(raw.entities)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Assignee for state "${stateName}" must have an "entities" array`,
    );
  }

  const type = parseEnum<ProcessAssigneeType>(
    raw.type,
    VALID_ASSIGNEE_TYPES,
    ProcessManagementErrorCode.PmInvalidAssigneeType,
    `Assignee for state "${stateName}" has invalid type: ${String(raw.type)}. Must be ONE, ALL, or ANY`,
  );

  const entities = raw.entities.map((item: unknown, i: number) =>
    parseProcessEntity(item, i),
  );

  return { type, entities };
}

function parseState(raw: unknown, stateName: string): ProcessState {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `State "${stateName}" must be an object`,
    );
  }

  if (typeof raw.index !== "number") {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `State "${stateName}" must have a numeric "index" property`,
    );
  }

  if (raw.assignee === undefined || raw.assignee === null) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `State "${stateName}" must have an "assignee" property`,
    );
  }

  const assignee = parseAssignee(raw.assignee, stateName);

  return {
    index: raw.index,
    assignee,
  };
}

function parseExecutableUser(
  raw: unknown,
  actionIndex: number,
): { entities: readonly ProcessEntity[] } {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${actionIndex}: executableUser must be an object`,
    );
  }

  if (!Array.isArray(raw.entities)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${actionIndex}: executableUser must have an "entities" array`,
    );
  }

  const entities = raw.entities.map((item: unknown, i: number) =>
    parseProcessEntity(item, i),
  );

  return { entities };
}

function parseAction(raw: unknown, index: number): ProcessAction {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${index} must be an object`,
    );
  }

  if (typeof raw.name !== "string") {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${index} must have a "name" string property`,
    );
  }

  if (typeof raw.from !== "string") {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${index} must have a "from" string property`,
    );
  }

  if (typeof raw.to !== "string") {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${index} must have a "to" string property`,
    );
  }

  const actionType: ProcessActionType =
    raw.type === undefined || raw.type === null
      ? "PRIMARY"
      : parseEnum<ProcessActionType>(
          raw.type,
          VALID_ACTION_TYPES,
          ProcessManagementErrorCode.PmInvalidConfigStructure,
          `Action at index ${index} has invalid type: ${String(raw.type)}. Must be PRIMARY or SECONDARY`,
        );

  const result: ProcessAction = {
    name: raw.name,
    from: raw.from,
    to: raw.to,
    filterCond: typeof raw.filterCond === "string" ? raw.filterCond : "",
    type: actionType,
  };

  if (
    actionType === "SECONDARY" &&
    raw.executableUser !== undefined &&
    raw.executableUser !== null
  ) {
    return {
      ...result,
      executableUser: parseExecutableUser(raw.executableUser, index),
    };
  }

  return result;
}

export const ProcessManagementConfigParser = {
  parse: (rawText: string): ProcessManagementConfig => {
    const parsed = parseYamlConfig(
      rawText,
      {
        emptyConfigText: ProcessManagementErrorCode.PmEmptyConfigText,
        invalidConfigYaml: ProcessManagementErrorCode.PmInvalidConfigYaml,
        invalidConfigStructure:
          ProcessManagementErrorCode.PmInvalidConfigStructure,
      },
      "Process management",
    );

    const enable =
      parsed.enable !== undefined && parsed.enable !== null
        ? parseStrictBoolean(
            parsed.enable,
            "enable",
            "Config",
            ProcessManagementErrorCode.PmInvalidBooleanField,
          )
        : false;

    if (
      parsed.states !== undefined &&
      parsed.states !== null &&
      !isRecord(parsed.states)
    ) {
      throw new BusinessRuleError(
        ProcessManagementErrorCode.PmInvalidConfigStructure,
        'Config "states" must be an object (map of state name to state definition)',
      );
    }

    const rawStates = isRecord(parsed.states) ? parsed.states : {};
    const states: Record<string, ProcessState> = {};

    for (const [name, value] of Object.entries(rawStates)) {
      states[name] = parseState(value, name);
    }

    if (!Array.isArray(parsed.actions) && parsed.actions !== undefined) {
      throw new BusinessRuleError(
        ProcessManagementErrorCode.PmInvalidConfigStructure,
        'Config "actions" must be an array',
      );
    }

    const rawActions: unknown[] = Array.isArray(parsed.actions)
      ? parsed.actions
      : [];
    const actions = rawActions.map((item: unknown, i: number) =>
      parseAction(item, i),
    );

    // Validate duplicate action names
    const actionNames = new Set<string>();
    for (const action of actions) {
      if (actionNames.has(action.name)) {
        throw new BusinessRuleError(
          ProcessManagementErrorCode.PmDuplicateActionName,
          `Duplicate action name: "${action.name}"`,
        );
      }
      actionNames.add(action.name);
    }

    // Validate action from/to references
    const stateNames = new Set(Object.keys(states));
    for (const action of actions) {
      if (!stateNames.has(action.from)) {
        throw new BusinessRuleError(
          ProcessManagementErrorCode.PmInvalidActionReference,
          `Action "${action.name}" references unknown "from" state: "${action.from}"`,
        );
      }
      if (!stateNames.has(action.to)) {
        throw new BusinessRuleError(
          ProcessManagementErrorCode.PmInvalidActionReference,
          `Action "${action.name}" references unknown "to" state: "${action.to}"`,
        );
      }
    }

    return { enable, states, actions };
  },
};
