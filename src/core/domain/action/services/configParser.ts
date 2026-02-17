import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import type { ActionConfig, ActionsConfig } from "../entity";
import { ActionErrorCode } from "../errorCode";
import type {
  ActionDestApp,
  ActionEntity,
  ActionEntityType,
  ActionMapping,
  ActionMappingSrcType,
} from "../valueObject";
import { VALID_ENTITY_TYPES, VALID_SRC_TYPES } from "../valueObject";

function parseDestApp(raw: unknown, actionName: string): ActionDestApp {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" destApp must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;
  const result: { app?: string; code?: string } = {};

  if (obj.app !== undefined && obj.app !== null) {
    result.app = String(obj.app);
  }

  if (obj.code !== undefined && obj.code !== null) {
    result.code = String(obj.code);
  }

  return result;
}

function parseMapping(
  raw: unknown,
  index: number,
  actionName: string,
): ActionMapping {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" mapping at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.srcType !== "string" || !VALID_SRC_TYPES.has(obj.srcType)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidSrcType,
      `Action "${actionName}" mapping at index ${index} has invalid srcType: ${String(obj.srcType)}. Must be FIELD or RECORD_URL`,
    );
  }

  if (typeof obj.destField !== "string" || obj.destField.length === 0) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" mapping at index ${index} must have a non-empty "destField" property`,
    );
  }

  const result: ActionMapping = {
    srcType: obj.srcType as ActionMappingSrcType,
    destField: obj.destField,
    ...(obj.srcField !== undefined &&
    obj.srcField !== null &&
    typeof obj.srcField === "string"
      ? { srcField: obj.srcField }
      : {}),
  };

  return result;
}

function parseEntity(
  raw: unknown,
  index: number,
  actionName: string,
): ActionEntity {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" entity at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== "string" || !VALID_ENTITY_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidEntityType,
      `Action "${actionName}" entity at index ${index} has invalid type: ${String(obj.type)}. Must be USER, GROUP, or ORGANIZATION`,
    );
  }

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" entity at index ${index} must have a non-empty "code" property`,
    );
  }

  return { type: obj.type as ActionEntityType, code: obj.code };
}

function parseActionConfig(raw: unknown, actionName: string): ActionConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (actionName.length === 0) {
    throw new BusinessRuleError(
      ActionErrorCode.AcEmptyActionName,
      "Action name (key) must not be empty",
    );
  }

  if (typeof obj.index !== "number") {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have a numeric "index" property`,
    );
  }

  if (typeof obj.destApp !== "object" || obj.destApp === null) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have a "destApp" object`,
    );
  }

  const destApp = parseDestApp(obj.destApp, actionName);

  if (!Array.isArray(obj.mappings)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have a "mappings" array`,
    );
  }

  const mappings = obj.mappings.map((item: unknown, i: number) =>
    parseMapping(item, i, actionName),
  );

  if (!Array.isArray(obj.entities)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have an "entities" array`,
    );
  }

  const entities = obj.entities.map((item: unknown, i: number) =>
    parseEntity(item, i, actionName),
  );

  const filterCond = typeof obj.filterCond === "string" ? obj.filterCond : "";

  return {
    index: obj.index,
    name: actionName,
    destApp,
    mappings,
    entities,
    filterCond,
  };
}

export const ActionConfigParser = {
  parse: (rawText: string): ActionsConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        ActionErrorCode.AcEmptyConfigText,
        "Action config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        ActionErrorCode.AcInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        ActionErrorCode.AcInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (typeof obj.actions !== "object" || obj.actions === null) {
      throw new BusinessRuleError(
        ActionErrorCode.AcInvalidConfigStructure,
        'Config must have an "actions" object',
      );
    }

    const rawActions = obj.actions as Record<string, unknown>;
    const actions: Record<string, ActionConfig> = {};

    for (const [key, value] of Object.entries(rawActions)) {
      actions[key] = parseActionConfig(value, key);
    }

    return { actions };
  },
};
