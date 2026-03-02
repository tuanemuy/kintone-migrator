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

  const result: { app?: string; code?: string } = {};

  if (raw.app !== undefined && raw.app !== null) {
    result.app = String(raw.app);
  }

  if (raw.code !== undefined && raw.code !== null) {
    result.code = String(raw.code);
  }

  if (result.app === undefined && result.code === undefined) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" destApp must have at least "app" or "code" property`,
    );
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

  if (typeof raw.srcType !== "string" || !isActionMappingSrcType(raw.srcType)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidSrcType,
      `Action "${actionName}" mapping at index ${index} has invalid srcType: ${String(raw.srcType)}. Must be FIELD or RECORD_URL`,
    );
  }

  if (typeof raw.destField !== "string" || raw.destField.length === 0) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" mapping at index ${index} must have a non-empty "destField" property`,
    );
  }

  const result: ActionMapping = {
    srcType: raw.srcType,
    destField: raw.destField,
    ...(raw.srcField !== undefined &&
    raw.srcField !== null &&
    typeof raw.srcField === "string"
      ? { srcField: raw.srcField }
      : {}),
  };

  if (result.srcType === "FIELD" && result.srcField === undefined) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" mapping at index ${index} with srcType "FIELD" must have a "srcField" property`,
    );
  }

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

  if (typeof raw.type !== "string" || !isActionEntityType(raw.type)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidEntityType,
      `Action "${actionName}" entity at index ${index} has invalid type: ${String(raw.type)}. Must be USER, GROUP, or ORGANIZATION`,
    );
  }

  if (typeof raw.code !== "string" || raw.code.length === 0) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" entity at index ${index} must have a non-empty "code" property`,
    );
  }

  return { type: raw.type, code: raw.code };
}

function parseActionConfig(raw: unknown, actionName: string): ActionConfig {
  // Reject empty keys early to produce a clearer error message
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

  if (
    typeof raw.index !== "number" ||
    !Number.isInteger(raw.index) ||
    raw.index < 0
  ) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have a non-negative integer "index" property`,
    );
  }

  if (!isRecord(raw.destApp)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have a "destApp" object`,
    );
  }

  const destApp = parseDestApp(raw.destApp, actionName);

  if (!Array.isArray(raw.mappings)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have a "mappings" array`,
    );
  }

  const mappings = raw.mappings.map((item: unknown, i: number) =>
    parseMapping(item, i, actionName),
  );

  if (!Array.isArray(raw.entities)) {
    throw new BusinessRuleError(
      ActionErrorCode.AcInvalidConfigStructure,
      `Action "${actionName}" must have an "entities" array`,
    );
  }

  const entities = raw.entities.map((item: unknown, i: number) =>
    parseEntity(item, i, actionName),
  );

  const filterCond = typeof raw.filterCond === "string" ? raw.filterCond : "";

  return {
    index: raw.index,
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

    const seenIndices = new Set<number>();
    for (const [key, action] of Object.entries(actions)) {
      if (seenIndices.has(action.index)) {
        throw new BusinessRuleError(
          ActionErrorCode.AcDuplicateIndex,
          `Duplicate action index ${action.index} found in action "${key}"`,
        );
      }
      seenIndices.add(action.index);
    }

    return { actions };
  },
};
