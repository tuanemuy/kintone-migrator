import { buildDiffResult } from "../../diff";
import type { CustomizationConfig } from "../entity";
import type {
  CustomizationDiffEntry,
  CustomizationResource,
  RemotePlatform,
  RemoteResource,
} from "../valueObject";

// FILE resources are compared by basename only; content-level diff is not supported.
function resourceName(resource: CustomizationResource): string {
  if (resource.type === "URL") return resource.url;
  return resource.path.replace(/\\/g, "/").split("/").pop() ?? resource.path;
}

function remoteResourceName(resource: RemoteResource): string {
  if (resource.type === "URL") return resource.url;
  return resource.file.name;
}

function compareResourceLists(
  localResources: readonly CustomizationResource[],
  remoteResources: readonly RemoteResource[],
  platform: "desktop" | "mobile",
  resourceType: "js" | "css",
): CustomizationDiffEntry[] {
  const entries: CustomizationDiffEntry[] = [];

  const localNames = new Set(localResources.map(resourceName));
  const remoteNames = new Set(remoteResources.map(remoteResourceName));

  for (const name of localNames) {
    if (!remoteNames.has(name)) {
      entries.push({
        type: "added",
        platform,
        resourceType,
        name,
        details: "new resource",
      });
    }
  }

  for (const name of remoteNames) {
    if (!localNames.has(name)) {
      entries.push({
        type: "deleted",
        platform,
        resourceType,
        name,
        details: "removed",
      });
    }
  }

  return entries;
}

function comparePlatform(
  localJs: readonly CustomizationResource[],
  localCss: readonly CustomizationResource[],
  remote: RemotePlatform,
  platform: "desktop" | "mobile",
): CustomizationDiffEntry[] {
  return [
    ...compareResourceLists(localJs, remote.js, platform, "js"),
    ...compareResourceLists(localCss, remote.css, platform, "css"),
  ];
}

export const CustomizationDiffDetector = {
  detect: (
    local: CustomizationConfig,
    remoteScope: string,
    remoteDesktop: RemotePlatform,
    remoteMobile: RemotePlatform,
  ) => {
    const entries: CustomizationDiffEntry[] = [];

    if ((local.scope ?? "ALL") !== remoteScope) {
      entries.push({
        type: "modified",
        platform: "config",
        resourceType: "scope",
        name: "scope",
        details: `${remoteScope} -> ${local.scope ?? "ALL"}`,
      });
    }

    entries.push(
      ...comparePlatform(
        local.desktop.js,
        local.desktop.css,
        remoteDesktop,
        "desktop",
      ),
    );

    entries.push(
      ...comparePlatform(
        local.mobile.js,
        local.mobile.css,
        remoteMobile,
        "mobile",
      ),
    );

    return buildDiffResult(entries);
  },
};
