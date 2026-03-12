import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "@/core/domain/services/configValidator";
import {
  isRecord,
  parseEntityBase,
  parseStrictBoolean,
} from "@/core/domain/typeGuards";
import type { AppPermissionConfig, AppRight } from "../entity";
import { AppPermissionErrorCode } from "../errorCode";
import type {
  AppPermissionEntity,
  AppPermissionEntityType,
} from "../valueObject";

const VALID_ENTITY_TYPES: ReadonlySet<AppPermissionEntityType> =
  new Set<AppPermissionEntityType>([
    "USER",
    "GROUP",
    "ORGANIZATION",
    "CREATOR",
  ]);

function parseEntity(raw: unknown, index: number): AppPermissionEntity {
  return parseEntityBase<AppPermissionEntityType>(
    raw,
    index,
    VALID_ENTITY_TYPES,
    {
      invalidStructure: AppPermissionErrorCode.ApInvalidConfigStructure,
      invalidType: AppPermissionErrorCode.ApInvalidEntityType,
      emptyCode: AppPermissionErrorCode.ApEmptyEntityCode,
    },
    {
      allowEmptyCode: (type) => type === "CREATOR",
    },
  );
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
  parse: (parsed: unknown): AppPermissionConfig => {
    const obj = validateParsedConfig(
      parsed,
      AppPermissionErrorCode.ApInvalidConfigStructure,
      "App permission",
    );

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
