import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import type { FieldPermissionConfig, FieldRight } from "../entity";
import { FieldPermissionErrorCode } from "../errorCode";
import type {
  EntityType,
  FieldPermissionEntity,
  FieldRightAccessibility,
  FieldRightEntity,
} from "../valueObject";

const VALID_ACCESSIBILITIES: ReadonlySet<string> = new Set([
  "READ",
  "WRITE",
  "NONE",
]);
const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "USER",
  "GROUP",
  "ORGANIZATION",
  "FIELD_ENTITY",
]);

function parseEntity(raw: unknown, index: number): FieldPermissionEntity {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidConfigStructure,
      `Entity at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== "string" || !VALID_ENTITY_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidEntityType,
      `Entity at index ${index} has invalid type: ${String(obj.type)}. Must be USER, GROUP, ORGANIZATION, or FIELD_ENTITY`,
    );
  }

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpEmptyEntityCode,
      `Entity at index ${index} must have a non-empty "code" property`,
    );
  }

  return { type: obj.type as EntityType, code: obj.code };
}

function parseFieldRightEntity(raw: unknown, index: number): FieldRightEntity {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidConfigStructure,
      `Field right entity at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (
    typeof obj.accessibility !== "string" ||
    !VALID_ACCESSIBILITIES.has(obj.accessibility)
  ) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidAccessibility,
      `Field right entity at index ${index} has invalid accessibility: ${String(obj.accessibility)}. Must be READ, WRITE, or NONE`,
    );
  }

  const entity = parseEntity(obj.entity, index);

  const result: FieldRightEntity = {
    accessibility: obj.accessibility as FieldRightAccessibility,
    entity,
  };

  if (obj.includeSubs !== undefined && obj.includeSubs !== null) {
    return { ...result, includeSubs: Boolean(obj.includeSubs) };
  }

  return result;
}

function parseFieldRight(raw: unknown, index: number): FieldRight {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidConfigStructure,
      `Field right at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpEmptyFieldCode,
      `Field right at index ${index} must have a non-empty "code" property`,
    );
  }

  if (!Array.isArray(obj.entities)) {
    throw new BusinessRuleError(
      FieldPermissionErrorCode.FpInvalidConfigStructure,
      `Field right at index ${index} must have an "entities" array`,
    );
  }

  const entities = obj.entities.map((item: unknown, i: number) =>
    parseFieldRightEntity(item, i),
  );

  return { code: obj.code, entities };
}

export const FieldPermissionConfigParser = {
  parse: (rawText: string): FieldPermissionConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        FieldPermissionErrorCode.FpEmptyConfigText,
        "Field permission config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        FieldPermissionErrorCode.FpInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        FieldPermissionErrorCode.FpInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed as Record<string, unknown>;

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
