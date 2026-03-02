import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type { ViewConfig } from "@/core/domain/view/entity";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";
import { isDeviceType, isViewType } from "@/core/domain/view/valueObject";

type KintoneView = {
  type: string;
  index: string;
  name: string;
  builtinType?: string;
  fields?: string[];
  date?: string;
  title?: string;
  html?: string;
  pager?: boolean;
  device?: string;
  filterCond?: string;
  sort?: string;
};

function fromKintoneView(name: string, raw: KintoneView): ViewConfig {
  if (!isViewType(raw.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected view type from kintone API: ${raw.type}`,
    );
  }

  let device: ViewConfig["device"];
  if (raw.device !== undefined) {
    if (!isDeviceType(raw.device)) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Unexpected device type from kintone API: ${raw.device}`,
      );
    }
    device = raw.device;
  }

  const config: ViewConfig = {
    type: raw.type,
    index: typeof raw.index === "string" ? Number(raw.index) : raw.index,
    name,
    ...(raw.builtinType !== undefined && { builtinType: raw.builtinType }),
    ...(raw.fields !== undefined && { fields: raw.fields }),
    ...(raw.date !== undefined && { date: raw.date }),
    ...(raw.title !== undefined && { title: raw.title }),
    ...(raw.html !== undefined && { html: raw.html }),
    ...(raw.pager !== undefined && { pager: raw.pager }),
    ...(device !== undefined && { device }),
    ...(raw.filterCond !== undefined && { filterCond: raw.filterCond }),
    ...(raw.sort !== undefined && { sort: raw.sort }),
  };

  return config;
}

function toKintoneView(config: ViewConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: config.type,
    index: String(config.index),
    name: config.name,
  };

  if (config.builtinType !== undefined) result.builtinType = config.builtinType;
  if (config.fields !== undefined) result.fields = [...config.fields];
  if (config.date !== undefined) result.date = config.date;
  if (config.title !== undefined) result.title = config.title;
  if (config.html !== undefined) result.html = config.html;
  if (config.pager !== undefined) result.pager = config.pager;
  if (config.device !== undefined) result.device = config.device;
  if (config.filterCond !== undefined) result.filterCond = config.filterCond;
  if (config.sort !== undefined) result.sort = config.sort;

  return result;
}

export class KintoneViewConfigurator implements ViewConfigurator {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getViews(): Promise<{
    views: Readonly<Record<string, ViewConfig>>;
    revision: string;
  }> {
    try {
      const response = await this.client.app.getViews({
        app: this.appId,
        lang: "default",
        preview: true,
      });

      const kintoneViews = response.views as Record<string, KintoneView>;
      const views: Record<string, ViewConfig> = {};

      for (const [name, raw] of Object.entries(kintoneViews)) {
        views[name] = fromKintoneView(name, raw);
      }

      return {
        views,
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get views",
        error,
      );
    }
  }

  async updateViews(params: {
    views: Readonly<Record<string, ViewConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const kintoneViews: Record<string, Record<string, unknown>> = {};

      for (const [name, config] of Object.entries(params.views)) {
        kintoneViews[name] = toKintoneView(config);
      }

      const requestParams: Record<string, unknown> = {
        app: this.appId,
        views: kintoneViews,
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateViews(
        requestParams as Parameters<typeof this.client.app.updateViews>[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update views",
        error,
      );
    }
  }
}
