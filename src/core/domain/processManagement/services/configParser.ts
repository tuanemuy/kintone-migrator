import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
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

function parseProcessEntity(raw: unknown, index: number): ProcessEntity {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Entity at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.type !== "string" || !VALID_ENTITY_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidEntityType,
      `Entity at index ${index} has invalid type: ${String(obj.type)}. Must be USER, GROUP, ORGANIZATION, FIELD_ENTITY, CREATOR, or CUSTOM_FIELD`,
    );
  }

  const result: ProcessEntity = {
    type: obj.type as ProcessEntityType,
  };

  const withCode =
    obj.code !== undefined && obj.code !== null
      ? { ...result, code: String(obj.code) }
      : result;

  if (obj.includeSubs !== undefined && obj.includeSubs !== null) {
    return { ...withCode, includeSubs: Boolean(obj.includeSubs) };
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

  const obj = raw;

  if (typeof obj.type !== "string" || !VALID_ASSIGNEE_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidAssigneeType,
      `Assignee for state "${stateName}" has invalid type: ${String(obj.type)}. Must be ONE, ALL, or ANY`,
    );
  }

  if (!Array.isArray(obj.entities)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Assignee for state "${stateName}" must have an "entities" array`,
    );
  }

  const entities = obj.entities.map((item: unknown, i: number) =>
    parseProcessEntity(item, i),
  );

  return {
    type: obj.type as ProcessAssigneeType,
    entities,
  };
}

function parseState(raw: unknown, stateName: string): ProcessState {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `State "${stateName}" must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.index !== "number") {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `State "${stateName}" must have a numeric "index" property`,
    );
  }

  if (obj.assignee === undefined || obj.assignee === null) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `State "${stateName}" must have an "assignee" property`,
    );
  }

  const assignee = parseAssignee(obj.assignee, stateName);

  return {
    index: obj.index,
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

  const obj = raw;

  if (!Array.isArray(obj.entities)) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${actionIndex}: executableUser must have an "entities" array`,
    );
  }

  const entities = obj.entities.map((item: unknown, i: number) =>
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

  const obj = raw;

  if (typeof obj.name !== "string") {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${index} must have a "name" string property`,
    );
  }

  if (typeof obj.from !== "string") {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${index} must have a "from" string property`,
    );
  }

  if (typeof obj.to !== "string") {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${index} must have a "to" string property`,
    );
  }

  if (
    obj.type !== undefined &&
    obj.type !== null &&
    (typeof obj.type !== "string" || !VALID_ACTION_TYPES.has(obj.type))
  ) {
    throw new BusinessRuleError(
      ProcessManagementErrorCode.PmInvalidConfigStructure,
      `Action at index ${index} has invalid type: ${String(obj.type)}. Must be PRIMARY or SECONDARY`,
    );
  }

  const actionType: ProcessActionType =
    typeof obj.type === "string" && VALID_ACTION_TYPES.has(obj.type)
      ? (obj.type as ProcessActionType)
      : "PRIMARY";

  const result: ProcessAction = {
    name: obj.name,
    from: obj.from,
    to: obj.to,
    filterCond: typeof obj.filterCond === "string" ? obj.filterCond : "",
    type: actionType,
  };

  if (
    actionType === "SECONDARY" &&
    obj.executableUser !== undefined &&
    obj.executableUser !== null
  ) {
    return {
      ...result,
      executableUser: parseExecutableUser(obj.executableUser, index),
    };
  }

  return result;
}

export const ProcessManagementConfigParser = {
  parse: (rawText: string): ProcessManagementConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        ProcessManagementErrorCode.PmEmptyConfigText,
        "Process management config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        ProcessManagementErrorCode.PmInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!isRecord(parsed)) {
      throw new BusinessRuleError(
        ProcessManagementErrorCode.PmInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed;

    const enable =
      obj.enable !== undefined && obj.enable !== null
        ? Boolean(obj.enable)
        : false;

    if (
      obj.states !== undefined &&
      obj.states !== null &&
      !isRecord(obj.states)
    ) {
      throw new BusinessRuleError(
        ProcessManagementErrorCode.PmInvalidConfigStructure,
        'Config "states" must be an object (map of state name to state definition)',
      );
    }

    const rawStates = isRecord(obj.states) ? obj.states : {};
    const states: Record<string, ProcessState> = {};

    for (const [name, value] of Object.entries(rawStates)) {
      states[name] = parseState(value, name);
    }

    if (!Array.isArray(obj.actions) && obj.actions !== undefined) {
      throw new BusinessRuleError(
        ProcessManagementErrorCode.PmInvalidConfigStructure,
        'Config "actions" must be an array',
      );
    }

    const rawActions = (obj.actions as unknown[] | undefined) ?? [];
    const actions = rawActions.map((item: unknown, i: number) =>
      parseAction(item, i),
    );

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
