import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import {
  isRecord,
  parseEnum,
  parseStrictBoolean,
} from "@/core/domain/typeGuards";
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

  if (typeof raw.type !== "string" || !VALID_ENTITY_TYPES.has(raw.type)) {
    throw new BusinessRuleError(
      AppPermissionErrorCode.ApInvalidEntityType,
      `Entity at index ${index} has invalid type: ${String(raw.type)}. Must be USER, GROUP, ORGANIZATION, or CREATOR`,
    );
  }

  const type = parseEnum<AppPermissionEntityType>(
    raw.type,
    VALID_ENTITY_TYPES,
    AppPermissionErrorCode.ApInvalidEntityType,
    `Entity at index ${index} has invalid type: ${raw.type}. Must be USER, GROUP, ORGANIZATION, or CREATOR`,
  );

  // CREATOR type can have empty code
  if (type === "CREATOR") {
    return { type, code: typeof raw.code === "string" ? raw.code : "" };
  }

  if (typeof raw.code !== "string" || raw.code.length === 0) {
    throw new BusinessRuleError(
      AppPermissionErrorCode.ApEmptyEntityCode,
      `Entity at index ${index} must have a non-empty "code" property`,
    );
  }

  return { type, code: raw.code };
}

function parseAppRight(raw: unknown, index: number): AppRight {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      AppPermissionErrorCode.ApInvalidConfigStructure,
      `App right at index ${index} must be an object`,
    );
  }

  const entity = parseEntity(raw.entity, index);

  return {
    entity,
    includeSubs: parseStrictBoolean(
      raw.includeSubs,
      "includeSubs",
      `App right at index ${index}`,
      AppPermissionErrorCode.ApInvalidBooleanField,
    ),
    appEditable: parseStrictBoolean(
      raw.appEditable,
      "appEditable",
      `App right at index ${index}`,
      AppPermissionErrorCode.ApInvalidBooleanField,
    ),
    recordViewable: parseStrictBoolean(
      raw.recordViewable,
      "recordViewable",
      `App right at index ${index}`,
      AppPermissionErrorCode.ApInvalidBooleanField,
    ),
    recordAddable: parseStrictBoolean(
      raw.recordAddable,
      "recordAddable",
      `App right at index ${index}`,
      AppPermissionErrorCode.ApInvalidBooleanField,
    ),
    recordEditable: parseStrictBoolean(
      raw.recordEditable,
      "recordEditable",
      `App right at index ${index}`,
      AppPermissionErrorCode.ApInvalidBooleanField,
    ),
    recordDeletable: parseStrictBoolean(
      raw.recordDeletable,
      "recordDeletable",
      `App right at index ${index}`,
      AppPermissionErrorCode.ApInvalidBooleanField,
    ),
    recordImportable: parseStrictBoolean(
      raw.recordImportable,
      "recordImportable",
      `App right at index ${index}`,
      AppPermissionErrorCode.ApInvalidBooleanField,
    ),
    recordExportable: parseStrictBoolean(
      raw.recordExportable,
      "recordExportable",
      `App right at index ${index}`,
      AppPermissionErrorCode.ApInvalidBooleanField,
    ),
  };
}

export const AppPermissionConfigParser = {
  parse: (rawText: string): AppPermissionConfig => {
    const parsed = parseYamlConfig(
      rawText,
      {
        emptyConfigText: AppPermissionErrorCode.ApEmptyConfigText,
        invalidConfigYaml: AppPermissionErrorCode.ApInvalidConfigYaml,
        invalidConfigStructure: AppPermissionErrorCode.ApInvalidConfigStructure,
      },
      "App permission",
    );

    if (!Array.isArray(parsed.rights)) {
      throw new BusinessRuleError(
        AppPermissionErrorCode.ApInvalidConfigStructure,
        'Config must have a "rights" array',
      );
    }

    const rights = parsed.rights.map((item: unknown, i: number) =>
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
