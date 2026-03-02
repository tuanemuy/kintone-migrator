import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import { isRecord } from "@/core/domain/typeGuards";
import type { CustomizationConfig } from "../entity";
import { CustomizationErrorCode } from "../errorCode";
import type {
  CustomizationPlatform,
  CustomizationResource,
} from "../valueObject";
import { isCustomizationScope, isResourceType } from "../valueObject";

function parseResource(raw: unknown, index: number): CustomizationResource {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      CustomizationErrorCode.CzInvalidConfigStructure,
      `Resource at index ${index} must be an object`,
    );
  }

  const obj = raw;
  const type = obj.type;

  if (typeof type !== "string" || !isResourceType(type)) {
    throw new BusinessRuleError(
      CustomizationErrorCode.CzInvalidResourceType,
      `Resource at index ${index} has invalid type: ${String(type)}. Must be FILE or URL`,
    );
  }

  if (type === "FILE") {
    if (typeof obj.path !== "string" || obj.path.length === 0) {
      throw new BusinessRuleError(
        CustomizationErrorCode.CzInvalidConfigStructure,
        `FILE resource at index ${index} must have a non-empty "path" property`,
      );
    }
    return { type: "FILE", path: obj.path };
  }

  if (typeof obj.url !== "string" || obj.url.length === 0) {
    throw new BusinessRuleError(
      CustomizationErrorCode.CzInvalidConfigStructure,
      `URL resource at index ${index} must have a non-empty "url" property`,
    );
  }
  return { type: "URL", url: obj.url };
}

function parseResourceList(raw: unknown): readonly CustomizationResource[] {
  if (!Array.isArray(raw)) {
    throw new BusinessRuleError(
      CustomizationErrorCode.CzInvalidConfigStructure,
      "Resource list must be an array",
    );
  }
  return raw.map((item, index) => parseResource(item, index));
}

function parsePlatform(raw: unknown): CustomizationPlatform {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      CustomizationErrorCode.CzInvalidConfigStructure,
      "Platform configuration must be an object",
    );
  }

  const obj = raw;

  const js =
    obj.js === undefined || obj.js === null ? [] : parseResourceList(obj.js);
  const css =
    obj.css === undefined || obj.css === null ? [] : parseResourceList(obj.css);

  return { js, css };
}

export const CustomizationConfigParser = {
  parse: (rawText: string): CustomizationConfig => {
    const obj = parseYamlConfig(
      rawText,
      {
        emptyConfigText: CustomizationErrorCode.CzEmptyConfigText,
        invalidConfigYaml: CustomizationErrorCode.CzInvalidConfigYaml,
        invalidConfigStructure: CustomizationErrorCode.CzInvalidConfigStructure,
      },
      "Customization",
    );

    let scope: CustomizationConfig["scope"];
    if (obj.scope !== undefined && obj.scope !== null) {
      if (typeof obj.scope !== "string" || !isCustomizationScope(obj.scope)) {
        throw new BusinessRuleError(
          CustomizationErrorCode.CzInvalidScope,
          `Invalid scope: ${String(obj.scope)}. Must be ALL, ADMIN, or NONE`,
        );
      }
      scope = obj.scope;
    }

    const desktop: CustomizationPlatform =
      obj.desktop === undefined || obj.desktop === null
        ? { js: [], css: [] }
        : parsePlatform(obj.desktop);
    const mobile: CustomizationPlatform =
      obj.mobile === undefined || obj.mobile === null
        ? { js: [], css: [] }
        : parsePlatform(obj.mobile);

    return { scope, desktop, mobile };
  },
};
