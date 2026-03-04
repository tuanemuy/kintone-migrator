import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FieldRight } from "@/core/domain/fieldPermission/entity";
import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type {
  FieldPermissionEntityType,
  FieldRightAccessibility,
  FieldRightEntity,
} from "@/core/domain/fieldPermission/valueObject";
import { wrapKintoneError } from "./wrapKintoneError";

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

type KintoneFieldAclEntity = {
  accessibility: string;
  entity: {
    type: string;
    code: string;
  };
  includeSubs?: boolean;
};

type KintoneFieldAclRight = {
  code: string;
  entities: KintoneFieldAclEntity[];
};

// Adapter layer: uses SystemError + `as` cast instead of domain parseEnum,
// because external API boundary errors are system errors, not business rule violations.
function fromKintoneEntity(raw: KintoneFieldAclEntity): FieldRightEntity {
  if (!VALID_ACCESSIBILITIES.has(raw.accessibility)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected accessibility value from kintone API: ${raw.accessibility}`,
    );
  }
  if (!VALID_ENTITY_TYPES.has(raw.entity.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected entity type from kintone API: ${raw.entity.type}`,
    );
  }

  const result: FieldRightEntity = {
    accessibility: raw.accessibility as FieldRightAccessibility,
    entity: {
      type: raw.entity.type as FieldPermissionEntityType,
      code: raw.entity.code,
    },
  };

  if (raw.includeSubs !== undefined) {
    return { ...result, includeSubs: raw.includeSubs };
  }

  return result;
}

function fromKintoneRight(raw: KintoneFieldAclRight): FieldRight {
  return {
    code: raw.code,
    entities: raw.entities.map(fromKintoneEntity),
  };
}

function toKintoneEntity(entity: FieldRightEntity): Record<string, unknown> {
  const result: Record<string, unknown> = {
    accessibility: entity.accessibility,
    entity: {
      type: entity.entity.type,
      code: entity.entity.code,
    },
  };

  if (entity.includeSubs !== undefined) {
    result.includeSubs = entity.includeSubs;
  }

  return result;
}

function toKintoneRight(right: FieldRight): Record<string, unknown> {
  return {
    code: right.code,
    entities: right.entities.map(toKintoneEntity),
  };
}

export class KintoneFieldPermissionConfigurator
  implements FieldPermissionConfigurator
{
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getFieldPermissions(): Promise<{
    rights: readonly FieldRight[];
    revision: string;
  }> {
    try {
      const response = await this.client.app.getFieldAcl({
        app: this.appId,
        preview: true,
      });

      const rights = (response.rights as KintoneFieldAclRight[]).map(
        fromKintoneRight,
      );

      return {
        rights,
        revision: response.revision as string,
      };
    } catch (error) {
      throw wrapKintoneError(error, "Failed to get field ACL");
    }
  }

  async updateFieldPermissions(params: {
    rights: readonly FieldRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const requestParams: Record<string, unknown> = {
        app: this.appId,
        rights: params.rights.map(toKintoneRight),
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateFieldAcl(
        requestParams as Parameters<typeof this.client.app.updateFieldAcl>[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      throw wrapKintoneError(error, "Failed to update field ACL");
    }
  }
}
