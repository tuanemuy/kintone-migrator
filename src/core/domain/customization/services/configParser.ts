import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import type { CustomizationConfig } from "../entity";
import { CustomizationErrorCode } from "../errorCode";
import type {
  CustomizationPlatform,
  CustomizationResource,
  CustomizationScope,
} from "../valueObject";

const VALID_SCOPES: ReadonlySet<string> = new Set(["ALL", "ADMIN", "NONE"]);
const VALID_RESOURCE_TYPES: ReadonlySet<string> = new Set(["FILE", "URL"]);

function parseResource(raw: unknown, index: number): CustomizationResource {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      CustomizationErrorCode.CzInvalidConfigStructure,
      `Resource at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string" || !VALID_RESOURCE_TYPES.has(type)) {
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
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      CustomizationErrorCode.CzInvalidConfigStructure,
      "Platform configuration must be an object",
    );
  }

  const obj = raw as Record<string, unknown>;

  const js =
    obj.js === undefined || obj.js === null ? [] : parseResourceList(obj.js);
  const css =
    obj.css === undefined || obj.css === null ? [] : parseResourceList(obj.css);

  return { js, css };
}

export const ConfigParser = {
  parse: (rawText: string): CustomizationConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        CustomizationErrorCode.CzEmptyConfigText,
        "Customization config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        CustomizationErrorCode.CzInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        CustomizationErrorCode.CzInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed as Record<string, unknown>;

    let scope: CustomizationScope | undefined;
    if (obj.scope !== undefined && obj.scope !== null) {
      if (typeof obj.scope !== "string" || !VALID_SCOPES.has(obj.scope)) {
        throw new BusinessRuleError(
          CustomizationErrorCode.CzInvalidScope,
          `Invalid scope: ${String(obj.scope)}. Must be ALL, ADMIN, or NONE`,
        );
      }
      scope = obj.scope as CustomizationScope;
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
