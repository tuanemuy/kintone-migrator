import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import {
  isRecord,
  parseEntityBase,
  parseStrictBoolean,
} from "@/core/domain/typeGuards";
import type { RecordPermissionConfig, RecordRight } from "../entity";
import { RecordPermissionErrorCode } from "../errorCode";
import type {
  RecordPermissionEntity,
  RecordPermissionEntityType,
  RecordPermissionRightEntity,
} from "../valueObject";

const VALID_ENTITY_TYPES: ReadonlySet<RecordPermissionEntityType> =
  new Set<RecordPermissionEntityType>([
    "USER",
    "GROUP",
    "ORGANIZATION",
    "FIELD_ENTITY",
  ]);

function parseEntity(raw: unknown, index: number): RecordPermissionEntity {
  return parseEntityBase<RecordPermissionEntityType>(
    raw,
    index,
    VALID_ENTITY_TYPES,
    {
      invalidStructure: RecordPermissionErrorCode.RpInvalidConfigStructure,
      invalidType: RecordPermissionErrorCode.RpInvalidEntityType,
      emptyCode: RecordPermissionErrorCode.RpEmptyEntityCode,
    },
  );
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

    for (const right of rights) {
      const seenKeys = new Set<string>();
      for (const re of right.entities) {
        const key = `${re.entity.type}:${re.entity.code}`;
        if (seenKeys.has(key)) {
          throw new BusinessRuleError(
            RecordPermissionErrorCode.RpDuplicateEntity,
            `Duplicate entity in filterCond "${right.filterCond}": ${re.entity.type} ${re.entity.code}`,
          );
        }
        seenKeys.add(key);
      }
    }

    return { rights };
  },
};
