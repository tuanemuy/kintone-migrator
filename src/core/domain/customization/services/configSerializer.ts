import { stringify as stringifyYaml } from "yaml";
import type { CustomizationConfig } from "../entity";
import type {
  CustomizationPlatform,
  CustomizationResource,
} from "../valueObject";

type SerializedResource =
  | { type: "FILE"; path: string }
  | { type: "URL"; url: string };

function serializeResource(
  resource: CustomizationResource,
): SerializedResource {
  if (resource.type === "FILE") {
    return { type: "FILE", path: resource.path };
  }
  return { type: "URL", url: resource.url };
}

function serializeResourceList(
  resources: readonly CustomizationResource[],
): SerializedResource[] {
  return resources.map(serializeResource);
}

function hasPlatformResources(platform: CustomizationPlatform): boolean {
  return platform.js.length > 0 || platform.css.length > 0;
}

function serializePlatform(
  platform: CustomizationPlatform,
): Record<string, unknown> {
  return {
    ...(platform.js.length > 0
      ? { js: serializeResourceList(platform.js) }
      : {}),
    ...(platform.css.length > 0
      ? { css: serializeResourceList(platform.css) }
      : {}),
  };
}

export const CustomizationConfigSerializer = {
  serialize: (config: CustomizationConfig): string => {
    const result: Record<string, unknown> = {
      ...(config.scope !== undefined ? { scope: config.scope } : {}),
      ...(hasPlatformResources(config.desktop)
        ? { desktop: serializePlatform(config.desktop) }
        : {}),
      ...(hasPlatformResources(config.mobile)
        ? { mobile: serializePlatform(config.mobile) }
        : {}),
    };

    return stringifyYaml(result, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
