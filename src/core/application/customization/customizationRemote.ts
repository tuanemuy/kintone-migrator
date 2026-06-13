import { join } from "node:path";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import {
  remoteResourceName,
  resourceName,
} from "@/core/domain/customization/services/diffDetector";
import type {
  CustomizationResource,
  LocalFileResource,
  RemoteCustomization,
  RemotePlatform,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import type { CustomizationThreeWayContainer } from "../container/customization";

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

/**
 * Computes the set of same-name FILE basenames whose local content differs from
 * the remote content, across all platforms/categories — the same signal the
 * 2-way `detectCustomizationDiff` uses for the `modified` entries. Reused here so
 * the 3-way merge marks divergent same-name files as conflicts (AC-9).
 */
export async function computeModifiedFileNames(
  local: CustomizationConfig,
  remote: RemoteCustomization,
  basePath: string,
  container: CustomizationThreeWayContainer,
): Promise<Set<string>> {
  const pairs = [
    ...matchedPairs(local.desktop.js, remote.desktop.js),
    ...matchedPairs(local.desktop.css, remote.desktop.css),
    ...matchedPairs(local.mobile.js, remote.mobile.js),
    ...matchedPairs(local.mobile.css, remote.mobile.css),
  ];

  const modified = new Set<string>();
  if (pairs.length === 0) {
    return modified;
  }

  const results = await Promise.all(
    pairs.map(async ({ localResource, remoteFileKey }) => {
      const localPath = join(basePath, localResource.path);
      const [localContent, remoteContent] = await Promise.all([
        container.fileContentReader.read(localPath),
        container.fileDownloader.download(remoteFileKey),
      ]);
      const isEqual = Buffer.from(localContent).equals(
        Buffer.from(remoteContent),
      );
      return { name: resourceName(localResource), isEqual };
    }),
  );

  for (const { name, isEqual } of results) {
    if (!isEqual) {
      modified.add(name);
    }
  }
  return modified;
}

/** Finds matched local-FILE + remote-FILE pairs by basename. */
function matchedPairs(
  localResources: readonly CustomizationResource[],
  remoteResources: readonly RemoteResource[],
): Array<{ localResource: LocalFileResource; remoteFileKey: string }> {
  const remoteFileMap = new Map<string, string>();
  for (const r of remoteResources) {
    if (r.type === "FILE") {
      remoteFileMap.set(remoteResourceName(r), r.file.fileKey);
    }
  }
  const pairs: Array<{
    localResource: LocalFileResource;
    remoteFileKey: string;
  }> = [];
  for (const local of localResources) {
    if (local.type !== "FILE") continue;
    const remoteFileKey = remoteFileMap.get(resourceName(local));
    if (remoteFileKey !== undefined) {
      pairs.push({ localResource: local, remoteFileKey });
    }
  }
  return pairs;
}
