import { buildDiffResult } from "../../diff";
import type { CustomizationConfig } from "../entity";
import {
  type CustomizationDiff,
  type CustomizationDiffEntry,
  type CustomizationResource,
  DEFAULT_CUSTOMIZATION_SCOPE,
  type RemoteCustomization,
  type RemotePlatform,
  type RemoteResource,
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
  warnings: string[],
): CustomizationDiffEntry[] {
  const entries: CustomizationDiffEntry[] = [];

  const localNames = localResources.map(resourceName);
  const remoteNames = remoteResources.map(remoteResourceName);
  // Set deduplicates names, so multiple FILE resources with the same
  // basename (e.g. "src/app.js" and "lib/app.js") collapse into one entry.
  // This is an accepted limitation since FILE resources are compared by basename only.
  const localNameSet = new Set(localNames);
  const remoteNameSet = new Set(remoteNames);

  const hasDuplicates =
    localNames.length !== localNameSet.size ||
    remoteNames.length !== remoteNameSet.size;

  if (hasDuplicates) {
    warnings.push(
      `[${platform}.${resourceType}] duplicate basenames detected; diff results may be inaccurate for FILE resources`,
    );
  }

  for (const name of localNameSet) {
    if (!remoteNameSet.has(name)) {
      entries.push({
        type: "added",
        platform,
        category: resourceType,
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
        category: resourceType,
        name,
        details: "removed",
      });
    }
  }

  // FILE resources matched by basename are not compared at content level.
  // Warn users that content changes within matched files won't appear in the diff.
  const matchedFiles = [...localNameSet].filter((n) => remoteNameSet.has(n));
  const hasLocalFiles = localResources.some((r) => r.type === "FILE");
  const hasRemoteFiles = remoteResources.some((r) => r.type === "FILE");
  if (matchedFiles.length > 0 && hasLocalFiles && hasRemoteFiles) {
    warnings.push(
      `[${platform}.${resourceType}] FILE resources are compared by name only; content changes are not detected`,
    );
  }

  // Detect order changes among shared resources.
  // Skip when duplicates exist — Set-based deduplication makes order comparison unreliable.
  if (!hasDuplicates) {
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
        category: resourceType,
        name: "(order)",
        details: "resource load order changed",
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
  warnings: string[],
): CustomizationDiffEntry[] {
  return [
    ...compareResourceLists(localJs, remote.js, platform, "js", warnings),
    ...compareResourceLists(localCss, remote.css, platform, "css", warnings),
  ];
}

export const CustomizationDiffDetector = {
  detect: (
    local: CustomizationConfig,
    remote: RemoteCustomization,
  ): CustomizationDiff => {
    const entries: CustomizationDiffEntry[] = [];
    const warnings: string[] = [];

    const localScope = local.scope ?? DEFAULT_CUSTOMIZATION_SCOPE;
    if (localScope !== remote.scope) {
      entries.push({
        type: "modified",
        platform: "config",
        category: "scope",
        name: "scope",
        details: `${remote.scope} -> ${localScope}`,
      });
    }

    entries.push(
      ...comparePlatform(
        local.desktop.js,
        local.desktop.css,
        remote.desktop,
        "desktop",
        warnings,
      ),
    );

    entries.push(
      ...comparePlatform(
        local.mobile.js,
        local.mobile.css,
        remote.mobile,
        "mobile",
        warnings,
      ),
    );

    return buildDiffResult(entries, warnings);
  },
};
