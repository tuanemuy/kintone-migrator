import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import type { ViewConfig, ViewsConfig } from "../entity";
import { ViewErrorCode } from "../errorCode";
import {
  type DeviceType,
  VALID_DEVICE_TYPES,
  VALID_VIEW_TYPES,
  type ViewType,
} from "../valueObject";

function parseViewConfig(name: string, raw: unknown): ViewConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidConfigStructure,
      `View "${name}" must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== "string" || !VALID_VIEW_TYPES.has(obj.type)) {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidViewType,
      `View "${name}" has invalid type: ${String(obj.type)}. Must be LIST, CALENDAR, or CUSTOM`,
    );
  }

  const config: ViewConfig = {
    type: obj.type as ViewType,
    index: typeof obj.index === "number" ? obj.index : 0,
    name,
    ...(obj.builtinType !== undefined && {
      builtinType: String(obj.builtinType),
    }),
    ...(Array.isArray(obj.fields) && { fields: obj.fields.map(String) }),
    ...(obj.date !== undefined && { date: String(obj.date) }),
    ...(obj.title !== undefined && { title: String(obj.title) }),
    ...(obj.html !== undefined && { html: String(obj.html) }),
    ...(obj.pager !== undefined && { pager: Boolean(obj.pager) }),
    ...(obj.device !== undefined && {
      device: (() => {
        const deviceStr = String(obj.device);
        if (!VALID_DEVICE_TYPES.has(deviceStr)) {
          throw new BusinessRuleError(
            ViewErrorCode.VwInvalidDeviceType,
            `View "${name}" has invalid device type: ${deviceStr}. Must be DESKTOP or ANY`,
          );
        }
        return deviceStr as DeviceType;
      })(),
    }),
    ...(obj.filterCond !== undefined && {
      filterCond: String(obj.filterCond),
    }),
    ...(obj.sort !== undefined && { sort: String(obj.sort) }),
  };

  return config;
}

export const ViewConfigParser = {
  parse: (rawText: string): ViewsConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        ViewErrorCode.VwEmptyConfigText,
        "View config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        ViewErrorCode.VwInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        ViewErrorCode.VwInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (
      typeof obj.views !== "object" ||
      obj.views === null ||
      Array.isArray(obj.views)
    ) {
      throw new BusinessRuleError(
        ViewErrorCode.VwInvalidConfigStructure,
        'Config must have a "views" object',
      );
    }

    const viewsObj = obj.views as Record<string, unknown>;
    const views: Record<string, ViewConfig> = {};

    for (const [name, value] of Object.entries(viewsObj)) {
      if (name.length === 0) {
        throw new BusinessRuleError(
          ViewErrorCode.VwEmptyViewName,
          "View name must not be empty",
        );
      }
      views[name] = parseViewConfig(name, value);
    }

    return { views };
  },
};
