import type { CustomizationConfig } from "../entity";
import type {
  CustomizationPlatform,
  CustomizationResource,
} from "../valueObject";

type SerializedResource =
  | { type: "FILE"; path: string }
  | { type: "URL"; url: string };

/**
 * Optional hook contributing extra keys to a serialized resource (e.g. the
 * state snapshot's per-FILE `digest`). Called for every resource as it is
 * generated, so callers never have to walk — let alone mutate — the output,
 * whose shape omits empty buckets and empty platforms.
 */
export type CustomizationResourceDecorator = (
  platform: "desktop" | "mobile",
  category: "js" | "css",
  resource: CustomizationResource,
) => Record<string, unknown> | undefined;

function serializeResource(
  resource: CustomizationResource,
  platform: "desktop" | "mobile",
  category: "js" | "css",
  decorate: CustomizationResourceDecorator | undefined,
): Record<string, unknown> {
  const serialized: SerializedResource =
    resource.type === "FILE"
      ? { type: "FILE", path: resource.path }
      : { type: "URL", url: resource.url };
  const extra = decorate?.(platform, category, resource);
  return extra === undefined ? serialized : { ...serialized, ...extra };
}

function serializeResourceList(
  resources: readonly CustomizationResource[],
  platform: "desktop" | "mobile",
  category: "js" | "css",
  decorate: CustomizationResourceDecorator | undefined,
): Record<string, unknown>[] {
  return resources.map((resource) =>
    serializeResource(resource, platform, category, decorate),
  );
}

function hasPlatformResources(platform: CustomizationPlatform): boolean {
  return platform.js.length > 0 || platform.css.length > 0;
}

function serializePlatform(
  platform: CustomizationPlatform,
  platformName: "desktop" | "mobile",
  decorate: CustomizationResourceDecorator | undefined,
): {
  js?: Record<string, unknown>[];
  css?: Record<string, unknown>[];
} {
  return {
    ...(platform.js.length > 0
      ? { js: serializeResourceList(platform.js, platformName, "js", decorate) }
      : {}),
    ...(platform.css.length > 0
      ? {
          css: serializeResourceList(
            platform.css,
            platformName,
            "css",
            decorate,
          ),
        }
      : {}),
  };
}

export const CustomizationConfigSerializer = {
  serialize: (
    config: CustomizationConfig,
    decorate?: CustomizationResourceDecorator,
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {
      ...(config.scope !== undefined ? { scope: config.scope } : {}),
      ...(hasPlatformResources(config.desktop)
        ? { desktop: serializePlatform(config.desktop, "desktop", decorate) }
        : {}),
      ...(hasPlatformResources(config.mobile)
        ? { mobile: serializePlatform(config.mobile, "mobile", decorate) }
        : {}),
    };

    return result;
  },
};
