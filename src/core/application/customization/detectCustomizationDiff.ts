import { join } from "node:path";
import {
  CustomizationDiffDetector,
  remoteResourceName,
  resourceName,
} from "@/core/domain/customization/services/diffDetector";
import type {
  CustomizationDiff,
  CustomizationResource,
  LocalFileResource,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import type { CustomizationDiffContainer } from "../container/customization";
import { ValidationError, ValidationErrorCode } from "../error";
import type { ServiceArgs } from "../types";
import { parseCustomizationConfigText } from "./parseConfig";

export type { CustomizationDiffEntry } from "@/core/domain/customization/valueObject";

type DetectCustomizationDiffInput = {
  basePath: string;
};

/**
 * Finds matched FILE resource pairs (local FILE + remote FILE with same basename)
 * across all platforms and categories.
 */
function findMatchedFilePairs(
  localResources: readonly CustomizationResource[],
  remoteResources: readonly RemoteResource[],
): Array<{ localResource: LocalFileResource; remoteFileKey: string }> {
  const pairs: Array<{
    localResource: LocalFileResource;
    remoteFileKey: string;
  }> = [];

  const remoteFileMap = new Map<string, string>();
  for (const r of remoteResources) {
    if (r.type === "FILE") {
      remoteFileMap.set(remoteResourceName(r), r.file.fileKey);
    }
  }

  for (const local of localResources) {
    if (local.type !== "FILE") continue;
    const name = resourceName(local);
    const remoteFileKey = remoteFileMap.get(name);
    if (remoteFileKey !== undefined) {
      pairs.push({ localResource: local, remoteFileKey });
    }
  }

  return pairs;
}

export async function detectCustomizationDiff({
  container,
  input,
}: ServiceArgs<
  CustomizationDiffContainer,
  DetectCustomizationDiffInput
>): Promise<CustomizationDiff> {
  const [storageResult, remote] = await Promise.all([
    container.customizationStorage.get(),
    container.customizationConfigurator.getCustomization(),
  ]);

  if (!storageResult.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Customization config file not found",
    );
  }

  const local = parseCustomizationConfigText(
    container.configCodec,
    storageResult.content,
  );

  // Collect all matched FILE pairs across platforms and categories
  const allPairs = [
    ...findMatchedFilePairs(local.desktop.js, remote.desktop.js),
    ...findMatchedFilePairs(local.desktop.css, remote.desktop.css),
    ...findMatchedFilePairs(local.mobile.js, remote.mobile.js),
    ...findMatchedFilePairs(local.mobile.css, remote.mobile.css),
  ];

  // Compare file contents in parallel
  const modifiedFileNames = new Set<string>();

  if (allPairs.length > 0) {
    const results = await Promise.all(
      allPairs.map(async ({ localResource, remoteFileKey }) => {
        const localPath = join(input.basePath, localResource.path);
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
        modifiedFileNames.add(name);
      }
    }
  }

  return CustomizationDiffDetector.detect(local, remote, modifiedFileNames);
}
