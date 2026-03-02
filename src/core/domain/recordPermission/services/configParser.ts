import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import {
  isRecord,
  parseEnum,
  parseStrictBoolean,
} from "@/core/domain/typeGuards";
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

function parseEntity(raw: unknown, index: number): RecordPermissionEntity {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidConfigStructure,
      `Entity at index ${index} must be an object`,
    );
  }

  if (typeof raw.type !== "string" || !VALID_ENTITY_TYPES.has(raw.type)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidEntityType,
      `Entity at index ${index} has invalid type: ${String(raw.type)}. Must be USER, GROUP, ORGANIZATION, or FIELD_ENTITY`,
    );
  }

  if (typeof raw.code !== "string" || raw.code.length === 0) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpEmptyEntityCode,
      `Entity at index ${index} must have a non-empty "code" property`,
    );
  }

  return {
    type: parseEnum<RecordPermissionEntityType>(
      raw.type,
      VALID_ENTITY_TYPES,
      RecordPermissionErrorCode.RpInvalidEntityType,
      `Entity at index ${index} has invalid type: ${raw.type}. Must be USER, GROUP, ORGANIZATION, or FIELD_ENTITY`,
    ),
    code: raw.code,
  };
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

  const entity = parseEntity(raw.entity, index);

  const context = `Record right entity at index ${index}`;

  return {
    entity,
    viewable: parseStrictBoolean(
      raw.viewable,
      "viewable",
      context,
      RecordPermissionErrorCode.RpInvalidPermissionValue,
      false,
    ),
    editable: parseStrictBoolean(
      raw.editable,
      "editable",
      context,
      RecordPermissionErrorCode.RpInvalidPermissionValue,
      false,
    ),
    deletable: parseStrictBoolean(
      raw.deletable,
      "deletable",
      context,
      RecordPermissionErrorCode.RpInvalidPermissionValue,
      false,
    ),
    includeSubs: parseStrictBoolean(
      raw.includeSubs,
      "includeSubs",
      context,
      RecordPermissionErrorCode.RpInvalidPermissionValue,
      false,
    ),
  };
}

function parseRecordRight(raw: unknown, index: number): RecordRight {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidConfigStructure,
      `Record right at index ${index} must be an object`,
    );
  }

  if (!Array.isArray(raw.entities)) {
    throw new BusinessRuleError(
      RecordPermissionErrorCode.RpInvalidConfigStructure,
      `Record right at index ${index} must have an "entities" array`,
    );
  }

  const entities = raw.entities.map((item: unknown, i: number) =>
    parseRecordRightEntity(item, i),
  );

  return {
    filterCond: typeof raw.filterCond === "string" ? raw.filterCond : "",
    entities,
  };
}

export const RecordPermissionConfigParser = {
  parse: (rawText: string): RecordPermissionConfig => {
    const parsed = parseYamlConfig(
      rawText,
      {
        emptyConfigText: RecordPermissionErrorCode.RpEmptyConfigText,
        invalidConfigYaml: RecordPermissionErrorCode.RpInvalidConfigYaml,
        invalidConfigStructure:
          RecordPermissionErrorCode.RpInvalidConfigStructure,
      },
      "Record permission",
    );

    if (!Array.isArray(parsed.rights)) {
      throw new BusinessRuleError(
        RecordPermissionErrorCode.RpInvalidConfigStructure,
        'Config must have a "rights" array',
      );
    }

    const rights = parsed.rights.map((item: unknown, i: number) =>
      parseRecordRight(item, i),
    );

    return { rights };
  },
};
