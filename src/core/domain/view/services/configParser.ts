import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import { isRecord } from "@/core/domain/typeGuards";
import type { ViewConfig, ViewsConfig } from "../entity";
import { ViewErrorCode } from "../errorCode";
import { isDeviceType, isViewType } from "../valueObject";

function parseDeviceType(name: string, raw: unknown): ViewConfig["device"] {
  if (raw === undefined) return undefined;
  const deviceStr = String(raw);
  if (!isDeviceType(deviceStr)) {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidDeviceType,
      `View "${name}" has invalid device type: ${deviceStr}. Must be DESKTOP or ANY`,
    );
  }
  return deviceStr;
}

function parseViewConfig(name: string, raw: unknown): ViewConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidConfigStructure,
      `View "${name}" must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.type !== "string" || !isViewType(obj.type)) {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidViewType,
      `View "${name}" has invalid type: ${String(obj.type)}. Must be LIST, CALENDAR, or CUSTOM`,
    );
  }

  // Issue 5.2: Validate index is a number when present
  if (obj.index !== undefined && typeof obj.index !== "number") {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidIndex,
      `View "${name}" has non-numeric index: ${String(obj.index)}`,
    );
  }

  const device = parseDeviceType(name, obj.device);

  const config: ViewConfig = {
    type: obj.type,
    index: typeof obj.index === "number" ? obj.index : 0,
    name,
    ...(obj.builtinType !== undefined && {
      builtinType: String(obj.builtinType),
    }),
    // Issue 5.3: Validate fields array elements are strings
    ...(Array.isArray(obj.fields) && {
      fields: obj.fields.map((f: unknown) =>
        typeof f === "string" ? f : String(f),
      ),
    }),
    ...(obj.date !== undefined && { date: String(obj.date) }),
    ...(obj.title !== undefined && { title: String(obj.title) }),
    ...(obj.html !== undefined && { html: String(obj.html) }),
    ...(obj.pager !== undefined && { pager: Boolean(obj.pager) }),
    ...(device !== undefined && { device }),
    ...(obj.filterCond !== undefined && {
      filterCond: String(obj.filterCond),
    }),
    ...(obj.sort !== undefined && { sort: String(obj.sort) }),
  };

  return config;
}

export const ViewConfigParser = {
  parse: (rawText: string): ViewsConfig => {
    const obj = parseYamlConfig(
      rawText,
      {
        emptyConfigText: ViewErrorCode.VwEmptyConfigText,
        invalidConfigYaml: ViewErrorCode.VwInvalidConfigYaml,
        invalidConfigStructure: ViewErrorCode.VwInvalidConfigStructure,
      },
      "View",
    );

    if (!isRecord(obj.views)) {
      throw new BusinessRuleError(
        ViewErrorCode.VwInvalidConfigStructure,
        'Config must have a "views" object',
      );
    }

    const viewsObj = obj.views;
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
