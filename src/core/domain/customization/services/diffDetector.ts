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

  const localNames = localResources.map(resourceName);
  const remoteNames = remoteResources.map(remoteResourceName);
  const localNameSet = new Set(localNames);
  const remoteNameSet = new Set(remoteNames);

  for (const name of localNameSet) {
    if (!remoteNameSet.has(name)) {
      entries.push({
        type: "added",
        platform,
        resourceType,
        name,
        details: "new resource",
      });
    }
  }

  for (const name of remoteNameSet) {
    if (!localNameSet.has(name)) {
      entries.push({
        type: "deleted",
        platform,
        resourceType,
        name,
        details: "removed",
      });
    }
  }

  // Detect order changes among shared resources
  const localShared = localNames.filter((n) => remoteNameSet.has(n));
  const remoteShared = remoteNames.filter((n) => localNameSet.has(n));
  if (
    localShared.length > 1 &&
    localShared.length === remoteShared.length &&
    localShared.some((n, i) => n !== remoteShared[i])
  ) {
    entries.push({
      type: "modified",
      platform,
      resourceType,
      name: "(order)",
      details: "resource load order changed",
    });
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
