import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ActionConfig } from "@/core/domain/action/entity";
import type { ActionConfigurator } from "@/core/domain/action/ports/actionConfigurator";
import type {
  ActionDestApp,
  ActionEntity,
  ActionMapping,
} from "@/core/domain/action/valueObject";
import {
  isActionEntityType,
  isActionMappingSrcType,
} from "@/core/domain/action/valueObject";
import { isBusinessRuleError } from "@/core/domain/error";

type KintoneActionMapping = {
  srcType: string;
  srcField?: string;
  destField: string;
};

type KintoneActionEntity = {
  type: string;
  code: string;
};

type KintoneActionConfig = {
  name: string;
  id?: string;
  index: string;
  destApp: {
    app?: string;
    code?: string;
  };
  mappings: KintoneActionMapping[];
  entities: KintoneActionEntity[];
  filterCond: string;
};

function fromKintoneDestApp(
  raw: KintoneActionConfig["destApp"],
): ActionDestApp {
  const result: { app?: string; code?: string } = {};

  if (raw.app !== undefined) {
    result.app = raw.app;
  }

  if (raw.code !== undefined) {
    result.code = raw.code;
  }

  return result;
}

function fromKintoneMapping(raw: KintoneActionMapping): ActionMapping {
  if (!isActionMappingSrcType(raw.srcType)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected srcType value from kintone API: ${raw.srcType}`,
    );
  }

  const result: ActionMapping = {
    srcType: raw.srcType,
    destField: raw.destField,
    ...(raw.srcField !== undefined ? { srcField: raw.srcField } : {}),
  };

  return result;
}

function fromKintoneEntity(raw: KintoneActionEntity): ActionEntity {
  if (!isActionEntityType(raw.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected entity type from kintone API: ${raw.type}`,
    );
  }

  return {
    type: raw.type,
    code: raw.code,
  };
}

function fromKintoneAction(raw: KintoneActionConfig): ActionConfig {
  return {
    index: Number(raw.index),
    name: raw.name,
    destApp: fromKintoneDestApp(raw.destApp),
    mappings: raw.mappings.map(fromKintoneMapping),
    entities: raw.entities.map(fromKintoneEntity),
    filterCond: raw.filterCond,
  };
}

function toKintoneDestApp(destApp: ActionDestApp): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (destApp.code !== undefined) {
    result.code = destApp.code;
  }

  if (destApp.app !== undefined) {
    result.app = destApp.app;
  }

  return result;
}

function toKintoneMapping(mapping: ActionMapping): Record<string, unknown> {
  const result: Record<string, unknown> = {
    srcType: mapping.srcType,
    destField: mapping.destField,
  };

  if (mapping.srcField !== undefined) {
    result.srcField = mapping.srcField;
  }

  return result;
}

function toKintoneEntity(entity: ActionEntity): Record<string, unknown> {
  return {
    type: entity.type,
    code: entity.code,
  };
}

function toKintoneAction(action: ActionConfig): Record<string, unknown> {
  return {
    index: String(action.index),
    name: action.name,
    destApp: toKintoneDestApp(action.destApp),
    mappings: action.mappings.map(toKintoneMapping),
    entities: action.entities.map(toKintoneEntity),
    filterCond: action.filterCond,
  };
}

export class KintoneActionConfigurator implements ActionConfigurator {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getActions(): Promise<{
    actions: Readonly<Record<string, ActionConfig>>;
    revision: string;
  }> {
    try {
      const response = await this.client.app.getAppActions({
        app: this.appId,
        lang: "default",
        preview: true,
      });

      const kintoneActions = response.actions as Record<
        string,
        KintoneActionConfig
      >;
      const actions: Record<string, ActionConfig> = {};
      for (const [key, value] of Object.entries(kintoneActions)) {
        actions[key] = fromKintoneAction(value);
      }

      return {
        actions,
        revision: response.revision,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get app actions",
        error,
      );
    }
  }

  async updateActions(params: {
    actions: Readonly<Record<string, ActionConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const kintoneActions: Record<string, Record<string, unknown>> = {};
      for (const [key, value] of Object.entries(params.actions)) {
        kintoneActions[key] = toKintoneAction(value);
      }

      const requestParams: Record<string, unknown> = {
        app: this.appId,
        actions: kintoneActions,
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateAppActions(
        requestParams as Parameters<typeof this.client.app.updateAppActions>[0],
      );

      return { revision: response.revision };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update app actions",
        error,
      );
    }
  }
}
