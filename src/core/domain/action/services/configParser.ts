import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import { isRecord } from "@/core/domain/typeGuards";
import type { ActionConfig, ActionsConfig } from "../entity";
import { ActionErrorCode } from "../errorCode";
import type {
  ActionDestApp,
  ActionEntity,
  ActionMapping,
} from "../valueObject";
import { isActionEntityType, isActionMappingSrcType } from "../valueObject";

function parseDestApp(raw: unknown, actionName: string): ActionDestApp {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" destApp must be an object`,
    );
  }

  const obj = raw;
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
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" mapping at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.srcType !== "string" || !isActionMappingSrcType(obj.srcType)) {
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
    srcType: obj.srcType,
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
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" entity at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.type !== "string" || !isActionEntityType(obj.type)) {
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

  return { type: obj.type, code: obj.code };
}

function parseActionConfig(raw: unknown, actionName: string): ActionConfig {
  // Issue 2.1: Check empty action name before isRecord check
  if (actionName.length === 0) {
    throw new BusinessRuleError(
      ActionErrorCode.AcEmptyActionName,
      "Action name (key) must not be empty",
    );
  }

  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.index !== "number") {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have a numeric "index" property`,
    );
  }

  if (!isRecord(obj.destApp)) {
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
    const obj = parseYamlConfig(
      rawText,
      {
        emptyConfigText: ActionErrorCode.AcEmptyConfigText,
        invalidConfigYaml: ActionErrorCode.AcInvalidConfigYaml,
        invalidConfigStructure: ActionErrorCode.AcInvalidConfigStructure,
      },
      "Action",
    );

    if (!isRecord(obj.actions)) {
      throw new BusinessRuleError(
        ActionErrorCode.AcInvalidConfigStructure,
        'Config must have an "actions" object',
      );
    }

    const rawActions = obj.actions;
    const actions: Record<string, ActionConfig> = {};

    for (const [key, value] of Object.entries(rawActions)) {
      actions[key] = parseActionConfig(value, key);
    }

    return { actions };
  },
};
