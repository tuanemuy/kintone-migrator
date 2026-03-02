import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import { isRecord } from "@/core/domain/typeGuards";
import type { ViewConfig, ViewsConfig } from "../entity";
import { ViewErrorCode } from "../errorCode";
import { isDeviceType, isViewType } from "../valueObject";

function parseDeviceType(name: string, raw: unknown): ViewConfig["device"] {
  if (raw === undefined || raw === null) return undefined;
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

  if (typeof raw.type !== "string" || !isViewType(raw.type)) {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidViewType,
      `View "${name}" has invalid type: ${String(raw.type)}. Must be LIST, CALENDAR, or CUSTOM`,
    );
  }

  // Reject non-numeric index early to avoid silent coercion
  if (
    raw.index !== undefined &&
    (typeof raw.index !== "number" ||
      !Number.isInteger(raw.index) ||
      raw.index < 0)
  ) {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidIndex,
      `View "${name}" has invalid index: ${String(raw.index)}. Must be a non-negative integer`,
    );
  }

  if (raw.fields !== undefined && !Array.isArray(raw.fields)) {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidConfigStructure,
      `View "${name}" has invalid fields: must be an array`,
    );
  }

  if (raw.pager !== undefined && typeof raw.pager !== "boolean") {
    throw new BusinessRuleError(
      ViewErrorCode.VwInvalidConfigStructure,
      `View "${name}" has invalid pager: must be a boolean`,
    );
  }

  const device = parseDeviceType(name, raw.device);

  const config: ViewConfig = {
    type: raw.type,
    index: typeof raw.index === "number" ? raw.index : 0,
    name,
    ...(raw.builtinType !== undefined && {
      builtinType: String(raw.builtinType),
    }),
    ...(Array.isArray(raw.fields) && {
      fields: raw.fields.map((f: unknown, i: number) => {
        if (typeof f !== "string") {
          throw new BusinessRuleError(
            ViewErrorCode.VwInvalidConfigStructure,
            `View "${name}" has non-string field at index ${i}: ${String(f)}`,
          );
        }
        return f;
      }),
    }),
    ...(raw.date !== undefined && { date: String(raw.date) }),
    ...(raw.title !== undefined && { title: String(raw.title) }),
    ...(raw.html !== undefined && { html: String(raw.html) }),
    ...(raw.pager !== undefined && { pager: raw.pager }),
    ...(device !== undefined && { device }),
    ...(raw.filterCond !== undefined && {
      filterCond: String(raw.filterCond),
    }),
    ...(raw.sort !== undefined && { sort: String(raw.sort) }),
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
