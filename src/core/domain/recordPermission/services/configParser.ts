import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
import type { RecordPermissionConfig, RecordRight } from "../entity";
import { RecordPermissionErrorCode } from "../errorCode";
import type {
  RecordPermissionEntity,
  RecordPermissionEntityType,
  RecordPermissionRightEntity,
} from "../valueObject";

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "USER",
  "GROUP",
  "ORGANIZATION",
  "FIELD_ENTITY",
]);

function parseBooleanField(
  value: unknown,
  fieldName: string,
  context: string,
): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  throw new BusinessRuleError(
    RecordPermissionErrorCode.RpInvalidPermissionValue,
    `${context} has invalid "${fieldName}" value: ${String(value)}. Must be a boolean`,
  );
}

function parseEntity(raw: unknown, index: number): RecordPermissionEntity {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidConfigStructure,
      `Entity at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.type !== "string" || !VALID_ENTITY_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidEntityType,
      `Entity at index ${index} has invalid type: ${String(obj.type)}. Must be USER, GROUP, ORGANIZATION, or FIELD_ENTITY`,
    );
  }

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpEmptyEntityCode,
      `Entity at index ${index} must have a non-empty "code" property`,
    );
  }

  return { type: obj.type as RecordPermissionEntityType, code: obj.code };
}

function parseRecordRightEntity(
  raw: unknown,
  index: number,
): RecordPermissionRightEntity {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidConfigStructure,
      `Record right entity at index ${index} must be an object`,
    );
  }

  const obj = raw;

  const entity = parseEntity(obj.entity, index);

  const context = `Record right entity at index ${index}`;

  return {
    entity,
    viewable: parseBooleanField(obj.viewable, "viewable", context),
    editable: parseBooleanField(obj.editable, "editable", context),
    deletable: parseBooleanField(obj.deletable, "deletable", context),
    includeSubs: parseBooleanField(obj.includeSubs, "includeSubs", context),
  };
}

function parseRecordRight(raw: unknown, index: number): RecordRight {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidConfigStructure,
      `Record right at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (!Array.isArray(obj.entities)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidConfigStructure,
      `Record right at index ${index} must have an "entities" array`,
    );
  }

  const entities = obj.entities.map((item: unknown, i: number) =>
    parseRecordRightEntity(item, i),
  );

  return {
    filterCond: typeof obj.filterCond === "string" ? obj.filterCond : "",
    entities,
  };
}

export const RecordPermissionConfigParser = {
  parse: (rawText: string): RecordPermissionConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        RecordPermissionErrorCode.RpEmptyConfigText,
        "Record permission config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        RecordPermissionErrorCode.RpInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!isRecord(parsed)) {
      throw new BusinessRuleError(
        RecordPermissionErrorCode.RpInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed;

    if (!Array.isArray(obj.rights)) {
      throw new BusinessRuleError(
        RecordPermissionErrorCode.RpInvalidConfigStructure,
        'Config must have a "rights" array',
      );
    }

    const rights = obj.rights.map((item: unknown, i: number) =>
      parseRecordRight(item, i),
    );

    return { rights };
  },
};
