import { resolve } from "node:path";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import type { FileContentReader } from "@/core/domain/customization/ports/fileContentReader";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";
import { resourceKey } from "@/core/domain/customization/services/customizationMerge";
import { resourceName } from "@/core/domain/customization/services/diffDetector";
import type {
  ContentDigest,
  CustomizationFileDigests,
  RemoteCustomization,
} from "@/core/domain/customization/valueObject";
import { computeContentDigest } from "@/lib/contentDigest";

const PLATFORMS = ["desktop", "mobile"] as const;
const CATEGORIES = ["js", "css"] as const;

/**
 * Digests the given local FILE resources.
 *
 * Paths resolve with `resolve(basePath, path)` — the same resolution push
 * uploads from and pull writes downloads to — so the digest always describes the
 * bytes that actually travel to kintone, including when an absolute path is
 * declared.
 *
 * `keys` restricts the read to the resource keys the caller needs; keys whose
 * body cannot be read are simply absent from the result (see
 * {@link readLocalDigest}).
 */
export async function computeFileDigests(
  config: CustomizationConfig,
  basePath: string,
  reader: FileContentReader,
  keys: ReadonlySet<string>,
): Promise<CustomizationFileDigests> {
  return digestLocalFiles(config, basePath, reader, keys);
}

/**
 * Digests every local FILE resource of a config about to be persisted as the new
 * base snapshot. Same path resolution and same failure handling as
 * {@link computeFileDigests}; unreadable files stay untracked in the snapshot.
 */
export async function computeSnapshotFileDigests(
  config: CustomizationConfig,
  basePath: string,
  reader: FileContentReader,
): Promise<CustomizationFileDigests> {
  return digestLocalFiles(config, basePath, reader, undefined);
}

async function digestLocalFiles(
  config: CustomizationConfig,
  basePath: string,
  reader: FileContentReader,
  keys: ReadonlySet<string> | undefined,
): Promise<CustomizationFileDigests> {
  const targets: Array<{ key: string; absolutePath: string }> = [];
  for (const platform of PLATFORMS) {
    for (const category of CATEGORIES) {
      for (const resource of config[platform][category]) {
        if (resource.type !== "FILE") {
          continue;
        }
        const key = resourceKey(platform, category, resourceName(resource));
        if (keys !== undefined && !keys.has(key)) {
          continue;
        }
        targets.push({ key, absolutePath: resolve(basePath, resource.path) });
      }
    }
  }

  const results = await Promise.all(
    targets.map(async ({ key, absolutePath }) => ({
      key,
      digest: await readLocalDigest(reader, absolutePath),
    })),
  );

  const digests = new Map<string, ContentDigest>();
  for (const { key, digest } of results) {
    if (digest !== undefined) {
      digests.set(key, digest);
    }
  }
  return digests;
}

/**
 * Reads and digests one local file, or reports "unknown" when it cannot be read.
 *
 * The swallow is deliberate (the one try/catch of this flow): a config may
 * declare a build artifact that has not been generated yet, and neither `diff`
 * nor `pull` nor drift detection should fail because of it. The key stays
 * untracked and the merge falls back to its conservative classification.
 */
async function readLocalDigest(
  reader: FileContentReader,
  absolutePath: string,
): Promise<ContentDigest | undefined> {
  try {
    return computeContentDigest(await reader.read(absolutePath));
  } catch {
    return undefined;
  }
}

/**
 * Downloads and digests the given remote FILE resources.
 *
 * The resource key and the fileKey are paired in a single walk of the raw remote
 * shape: an index keyed by the remote file name could not be looked up when a
 * name contains `/`, because the merge key uses the trailing segment only. A
 * download failure propagates — a transient network error must not silently
 * degrade into "the remote has no content for this key" and change the
 * classification.
 */
export async function computeRemoteFileDigests(
  remote: RemoteCustomization,
  downloader: FileDownloader,
  keys: ReadonlySet<string>,
): Promise<CustomizationFileDigests> {
  const targets: Array<{ key: string; fileKey: string }> = [];
  for (const platform of PLATFORMS) {
    for (const category of CATEGORIES) {
      for (const resource of remote[platform][category]) {
        if (resource.type !== "FILE") {
          continue;
        }
        const key = resourceKey(
          platform,
          category,
          resourceName({ type: "FILE", path: resource.file.name }),
        );
        if (!keys.has(key)) {
          continue;
        }
        targets.push({ key, fileKey: resource.file.fileKey });
      }
    }
  }

  const results = await Promise.all(
    targets.map(
      async ({ key, fileKey }) =>
        [
          key,
          computeContentDigest(await downloader.download(fileKey)),
        ] as const,
    ),
  );
  return new Map(results);
}
