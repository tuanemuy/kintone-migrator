import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
import type { AppPermissionConfig, AppRight } from "../entity";
import { AppPermissionErrorCode } from "../errorCode";
import type {
  AppPermissionEntity,
  AppPermissionEntityType,
} from "../valueObject";

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "USER",
  "GROUP",
  "ORGANIZATION",
  "CREATOR",
]);

function parseEntity(raw: unknown, index: number): AppPermissionEntity {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      AppPermissionErrorCode.ApInvalidConfigStructure,
      `Entity at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.type !== "string" || !VALID_ENTITY_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      AppPermissionErrorCode.ApInvalidEntityType,
      `Entity at index ${index} has invalid type: ${String(obj.type)}. Must be USER, GROUP, ORGANIZATION, or CREATOR`,
    );
  }

  const type = obj.type as AppPermissionEntityType;

  // CREATOR type can have empty code
  if (type === "CREATOR") {
    return { type, code: typeof obj.code === "string" ? obj.code : "" };
  }

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      AppPermissionErrorCode.ApEmptyEntityCode,
      `Entity at index ${index} must have a non-empty "code" property`,
    );
  }

  return { type, code: obj.code };
}

function parseBooleanField(
  obj: Record<string, unknown>,
  field: string,
  index: number,
): boolean {
  const value = obj[field];
  if (typeof value !== "boolean") {
    throw new BusinessRuleError(
      AppPermissionErrorCode.ApInvalidBooleanField,
      `App right at index ${index} must have a boolean "${field}" property`,
    );
  }
  return value;
}

function parseAppRight(raw: unknown, index: number): AppRight {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      AppPermissionErrorCode.ApInvalidConfigStructure,
      `App right at index ${index} must be an object`,
    );
  }

  const obj = raw;

  const entity = parseEntity(obj.entity, index);

  return {
    entity,
    includeSubs: parseBooleanField(obj, "includeSubs", index),
    appEditable: parseBooleanField(obj, "appEditable", index),
    recordViewable: parseBooleanField(obj, "recordViewable", index),
    recordAddable: parseBooleanField(obj, "recordAddable", index),
    recordEditable: parseBooleanField(obj, "recordEditable", index),
    recordDeletable: parseBooleanField(obj, "recordDeletable", index),
    recordImportable: parseBooleanField(obj, "recordImportable", index),
    recordExportable: parseBooleanField(obj, "recordExportable", index),
  };
}

export const AppPermissionConfigParser = {
  parse: (rawText: string): AppPermissionConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        AppPermissionErrorCode.ApEmptyConfigText,
        "App permission config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        AppPermissionErrorCode.ApInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!isRecord(parsed)) {
      throw new BusinessRuleError(
        AppPermissionErrorCode.ApInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed;

    if (!Array.isArray(obj.rights)) {
      throw new BusinessRuleError(
        AppPermissionErrorCode.ApInvalidConfigStructure,
        'Config must have a "rights" array',
      );
    }

    const rights = obj.rights.map((item: unknown, i: number) =>
      parseAppRight(item, i),
    );

    const seenKeys = new Set<string>();
    for (const right of rights) {
      const key = `${right.entity.type}:${right.entity.code}`;
      if (seenKeys.has(key)) {
        throw new BusinessRuleError(
          AppPermissionErrorCode.ApDuplicateEntity,
          `Duplicate entity: ${right.entity.type} ${right.entity.code}`,
        );
      }
      seenKeys.add(key);
    }

    return { rights };
  },
};
