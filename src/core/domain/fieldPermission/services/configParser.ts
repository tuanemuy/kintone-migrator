import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "@/core/domain/services/configValidator";
import {
  isRecord,
  parseEntityBase,
  parseEnum,
  parseStrictBoolean,
} from "@/core/domain/typeGuards";
import type { FieldPermissionConfig, FieldRight } from "../entity";
import { FieldPermissionErrorCode } from "../errorCode";
import type {
  FieldPermissionEntity,
  FieldPermissionEntityType,
  FieldRightAccessibility,
  FieldRightEntity,
} from "../valueObject";

const VALID_ACCESSIBILITIES: ReadonlySet<FieldRightAccessibility> =
  new Set<FieldRightAccessibility>(["READ", "WRITE", "NONE"]);
const VALID_ENTITY_TYPES: ReadonlySet<FieldPermissionEntityType> =
  new Set<FieldPermissionEntityType>([
    "USER",
    "GROUP",
    "ORGANIZATION",
    "FIELD_ENTITY",
  ]);

function parseEntity(raw: unknown, index: number): FieldPermissionEntity {
  return parseEntityBase<FieldPermissionEntityType>(
    raw,
    index,
    VALID_ENTITY_TYPES,
    {
      invalidStructure: FieldPermissionErrorCode.FpInvalidConfigStructure,
      invalidType: FieldPermissionErrorCode.FpInvalidEntityType,
      emptyCode: FieldPermissionErrorCode.FpEmptyEntityCode,
    },
  );
}

function parseFieldRightEntity(raw: unknown, index: number): FieldRightEntity {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidConfigStructure,
      `Field right entity at index ${index} must be an object`,
    );
  }

  const accessibility = parseEnum<FieldRightAccessibility>(
    raw.accessibility,
    VALID_ACCESSIBILITIES,
    FieldPermissionErrorCode.FpInvalidAccessibility,
    `Field right entity at index ${index} has invalid accessibility: ${String(raw.accessibility)}. Must be READ, WRITE, or NONE`,
  );

  const entity = parseEntity(raw.entity, index);

  const result: FieldRightEntity = {
    accessibility,
    entity,
  };

  if (raw.includeSubs !== undefined && raw.includeSubs !== null) {
    return {
      ...result,
      includeSubs: parseStrictBoolean(
        raw.includeSubs,
        "includeSubs",
        `Field right entity at index ${index}`,
        FieldPermissionErrorCode.FpInvalidBooleanField,
      ),
    };
  }

  return result;
}

function parseFieldRight(raw: unknown, index: number): FieldRight {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidConfigStructure,
      `Field right at index ${index} must be an object`,
    );
  }

  if (typeof raw.code !== "string" || raw.code.length === 0) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpEmptyFieldCode,
      `Field right at index ${index} must have a non-empty "code" property`,
    );
  }

  if (!Array.isArray(raw.entities)) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidConfigStructure,
      `Field right at index ${index} must have an "entities" array`,
    );
  }

  const entities = raw.entities.map((item: unknown, i: number) =>
    parseFieldRightEntity(item, i),
  );

  return { code: raw.code, entities };
}

export const FieldPermissionConfigParser = {
  parse: (parsed: unknown): FieldPermissionConfig => {
    const obj = validateParsedConfig(
      parsed,
      FieldPermissionErrorCode.FpInvalidConfigStructure,
      "Field permission",
    );

    if (!Array.isArray(obj.rights)) {
      throw new BusinessRuleError(
        FieldPermissionErrorCode.FpInvalidConfigStructure,
        'Config must have a "rights" array',
      );
    }

    const rights = obj.rights.map((item: unknown, i: number) =>
      parseFieldRight(item, i),
    );

    const seenCodes = new Set<string>();
    for (const right of rights) {
      if (seenCodes.has(right.code)) {
        throw new BusinessRuleError(
          FieldPermissionErrorCode.FpDuplicateFieldCode,
          `Duplicate field code: ${right.code}`,
        );
      }
      seenCodes.add(right.code);
    }

    return { rights };
  },
};
