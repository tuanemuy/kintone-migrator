import { stringify as stringifyYaml } from "yaml";
import type { CustomizationConfig } from "../entity";
import type {
  CustomizationPlatform,
  CustomizationResource,
} from "../valueObject";

function serializeResource(
  resource: CustomizationResource,
): Record<string, unknown> {
  if (resource.type === "FILE") {
    return { type: "FILE", path: resource.path };
  }
  return { type: "URL", url: resource.url };
}

function serializeResourceList(
  resources: readonly CustomizationResource[],
): Record<string, unknown>[] {
  return resources.map(serializeResource);
}

function serializePlatform(
  platform: CustomizationPlatform,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (platform.js.length > 0) {
    result.js = serializeResourceList(platform.js);
  }
  if (platform.css.length > 0) {
    result.css = serializeResourceList(platform.css);
  }
  return result;
}

export const CustomizationConfigSerializer = {
  serialize: (config: CustomizationConfig): string => {
    const result: Record<string, unknown> = {};

    if (config.scope !== undefined) {
      result.scope = config.scope;
    }

    result.desktop = serializePlatform(config.desktop);

    if (config.mobile.js.length > 0 || config.mobile.css.length > 0) {
      result.mobile = serializePlatform(config.mobile);
    }

    return stringifyYaml(result, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
