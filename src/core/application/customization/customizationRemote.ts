import type { CustomizationConfig } from "@/core/domain/customization/entity";
import type {
  CustomizationResource,
  RemoteCustomization,
  RemotePlatform,
  RemoteResource,
} from "@/core/domain/customization/valueObject";

/**
 * Converts the kintone remote customization (file metadata) into a
 * {@link CustomizationConfig} view for the file-name-keyed 3-way merge. Remote
 * FILE resources become FILE resources whose `path` is the file name, so
 * `resourceName` yields the same key on both sides; URLs are preserved.
 */
export function remoteToConfig(
  remote: RemoteCustomization,
): CustomizationConfig {
  const platform = (p: RemotePlatform) => ({
    js: p.js.map(toResource),
    css: p.css.map(toResource),
  });
  return {
    scope: remote.scope,
    desktop: platform(remote.desktop),
    mobile: platform(remote.mobile),
  };
}

function toResource(resource: RemoteResource): CustomizationResource {
  if (resource.type === "URL") {
    return { type: "URL", url: resource.url };
  }
  return { type: "FILE", path: resource.file.name };
}
