import type { CustomizationConfig } from "../entity";
import type {
  CustomizationDiff,
  CustomizationDiffEntry,
  CustomizationResource,
  RemotePlatform,
  RemoteResource,
} from "../valueObject";

function resourceName(resource: CustomizationResource): string {
  if (resource.type === "URL") return resource.url;
  // For FILE resources, use the basename of the path
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
  ): CustomizationDiff => {
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

    const added = entries.filter((e) => e.type === "added").length;
    const modified = entries.filter((e) => e.type === "modified").length;
    const deleted = entries.filter((e) => e.type === "deleted").length;

    return {
      entries,
      summary: { added, modified, deleted, total: added + modified + deleted },
      isEmpty: entries.length === 0,
    };
  },
};
