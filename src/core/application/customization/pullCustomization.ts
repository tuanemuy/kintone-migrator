import { resolve } from "node:path";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import {
  type CustomizationMergeResolution,
  type CustomizationThreeWayMerge,
  type EstimatedBaseKeys,
  fileResourceKeys,
  resolveCustomizationMerge,
  resourceKey,
} from "@/core/domain/customization/services/customizationMerge";
import {
  remoteResourceName,
  resourceName,
} from "@/core/domain/customization/services/diffDetector";
import type {
  ContentDigest,
  CustomizationFileDigests,
  CustomizationResource,
  LocalFileResource,
  RemoteCustomization,
} from "@/core/domain/customization/valueObject";
import type {
  CustomizationThreeWayContainer,
  CustomizationThreeWayServiceArgs,
} from "../container/customization";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { captureCustomization } from "./captureCustomization";
import {
  computeFileDigests,
  computeSnapshotFileDigests,
} from "./customizationDigests";
import { saveCustomizationSnapshotAndRevision } from "./customizationStateIo";
import { buildCustomizationThreeWayMerge } from "./customizationThreeWayMerge";
import { loadCustomizationThreeWayInputs } from "./loadCustomizationThreeWayInputs";

export type PullCustomizationInput = {
  /**
   * Base path the local resource paths resolve against (used for content
   * comparison and writing merged files — `dir/<filePrefix>`).
   */
  readonly basePath: string;
  /** Base path passed to `capture` (the config-file directory). */
  readonly captureBasePath: string;
  /** The directory prefix passed to capture when (re)initializing from remote. */
  readonly filePrefix: string;
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullCustomizationOutput =
  | { readonly mode: "force" }
  | { readonly mode: "firstTime" }
  | {
      readonly mode: "merged";
      readonly merge: CustomizationThreeWayMerge;
      readonly local: CustomizationConfig;
      readonly remote: RemoteCustomization;
      readonly remoteConfig: CustomizationConfig;
      readonly remoteRevision: string;
      /**
       * Digests of the remote bodies fetched while computing the merge. Handed
       * to {@link applyPulledCustomizationMerge} so the new base records what
       * the remote holds (see its `remoteDigests`).
       */
      readonly remoteDigests: CustomizationFileDigests;
      /**
       * Keys whose base tag had to be estimated because no baseline digest was
       * recorded. The CLI warns before asking which side of a conflict to keep:
       * a conservatively estimated key may not be a real divergence at all.
       */
      readonly estimatedKeys: EstimatedBaseKeys;
    };

/**
 * First stage of `customize pull`.
 *
 * - `force` / first run (no state or no local): downloads the remote file bodies
 *   and overwrites local + initializes the base, reusing `captureCustomization`
 *   (capture-equivalent). This writes to disk but never to the remote.
 * - otherwise: computes the file-name-keyed 3-way merge and returns it for
 *   conflict resolution by the CLI. No local file / config / state is written
 *   here — that happens in {@link applyPulledCustomizationMerge} after
 *   resolution, so an aborted resolution leaves the working copy untouched.
 */
export async function pullCustomization({
  container,
  input,
}: CustomizationThreeWayServiceArgs<PullCustomizationInput>): Promise<PullCustomizationOutput> {
  const { state, baseRevision, local, remote } =
    await loadCustomizationThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    // Capture-equivalent: download remote file bodies, write config + files.
    // When a local config exists (force, or state-loss recovery), preserve its
    // declared FILE paths so `path` (a local-owned concern) survives the pull.
    const preservePaths =
      local !== undefined ? buildPreservePaths(local) : undefined;
    const captured = await captureCustomization({
      container,
      input: {
        basePath: input.captureBasePath,
        filePrefix: input.filePrefix,
        preservePaths,
      },
    });
    await container.customizationStorage.update(captured.configText);
    // The bodies we just wrote are exactly what the remote holds, so digest them
    // from disk. `input.basePath` (not `captureBasePath`) is what the captured
    // config's paths resolve against — the two differ whenever a file prefix is
    // in play, and reading from the wrong base would silently record nothing.
    const fileDigests = await computeSnapshotFileDigests(
      captured.config,
      input.basePath,
      container.fileContentReader,
    );
    // Persist the config we actually wrote as the new base (base == local),
    // keeping pull symmetric with push instead of the basename-only remote view.
    await saveCustomizationSnapshotAndRevision(
      container,
      captured.config,
      fileDigests,
      remote.revision,
    );
    return { mode: input.force ? "force" : "firstTime" };
  }

  const { merge, remoteDigests, estimatedKeys } =
    await buildCustomizationThreeWayMerge({
      container,
      state,
      baseRevision,
      local,
      remote,
      basePath: input.basePath,
    });

  return {
    mode: "merged",
    merge,
    local,
    remote: remote.raw,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
    remoteDigests,
    estimatedKeys,
  };
}

export type ApplyPulledCustomizationMergeInput = {
  readonly basePath: string;
  readonly merge: CustomizationThreeWayMerge;
  readonly resolution: CustomizationMergeResolution;
  readonly local: CustomizationConfig;
  readonly remote: RemoteCustomization;
  readonly remoteConfig: CustomizationConfig;
  readonly remoteRevision: string;
  /**
   * `remoteDigests` from the first stage, passed through unchanged. Required
   * rather than optional so a caller that forgets it fails to compile: a merge
   * whose base digests came from disk would mark local-side wins as already
   * uploaded and turn them into remote drift on the next run.
   */
  readonly remoteDigests: CustomizationFileDigests;
};

/**
 * Second stage of `customize pull`: applies a resolved 3-way merge.
 *
 * Reconstructs the merged config (file names), downloads the bodies of every
 * FILE resource that did NOT already exist locally with the same name (i.e.
 * remote-only / remote-side conflict resolutions), writes the merged config
 * YAML, and updates the base to the remote snapshot/revision. Files already on
 * disk (local-only or local-side resolutions) are left as-is. Called only after
 * the CLI has resolved all conflicts; never invoked on abort.
 */
export async function applyPulledCustomizationMerge({
  container,
  input,
}: CustomizationThreeWayServiceArgs<ApplyPulledCustomizationMergeInput>): Promise<void> {
  const merged = wrapBusinessRuleError(() =>
    resolveCustomizationMerge(
      input.merge,
      input.resolution,
      input.local,
      input.remoteConfig,
    ),
  );

  // Merge keys whose body must be taken from the remote: every `remoteOnly`
  // entry plus every conflict resolved to `remote`. (`localOnly` / `bothSame` /
  // `unchanged` keep the local on-disk copy — same content, no re-download.)
  // Keyed by the bucket-qualified merge identity, so a divergence in one bucket
  // never drags a same-basename file of another bucket into the download set.
  const fromRemote = new Set<string>();
  for (const entry of input.merge.entries) {
    if (entry.change.kind === "remoteOnly") {
      fromRemote.add(entry.key);
    } else if (
      entry.change.kind === "conflict" &&
      input.resolution.get(entry.key) === "remote"
    ) {
      fromRemote.add(entry.key);
    }
  }

  // Remote fileKey lookup under the same bucket-qualified identity.
  const remoteFileKeys = remoteFileKeyMap(input.remote);

  const downloads: Promise<void>[] = [];
  for (const { platform, category, resource } of allFileResources(merged)) {
    const key = resourceKey(platform, category, resourceName(resource));
    if (!fromRemote.has(key)) {
      continue;
    }
    const fileKey = remoteFileKeys.get(key);
    if (fileKey === undefined) {
      continue;
    }
    const absolutePath = resolve(input.basePath, resource.path);
    downloads.push(
      (async () => {
        const data = await container.fileDownloader.download(fileKey);
        await container.fileWriter.write(absolutePath, data);
      })(),
    );
  }
  await Promise.all(downloads);

  const configText = stringifyConfig(
    container.configCodec,
    CustomizationConfigSerializer.serialize(merged),
  );
  await container.customizationStorage.update(configText);
  const fileDigests = await buildMergedBaseDigests(
    merged,
    input.basePath,
    input.remoteDigests,
    container,
  );
  // Base == the config we just wrote locally (declared paths), so a subsequent
  // push sees no drift and `git diff` stays clean (push-symmetric).
  await saveCustomizationSnapshotAndRevision(
    container,
    merged,
    fileDigests,
    input.remoteRevision,
  );
}

/**
 * Base digests for a merge that was just applied.
 *
 * A key the remote still holds records the *remote's* digest, even when the
 * local side won the merge: the base means "what local and remote last agreed
 * on", and content that stayed local was never uploaded. Recording the on-disk
 * bytes instead would make the very next diff report the local edit as remote
 * drift and block the push — the bug this whole flow exists to avoid. Keys the
 * remote does not have (locally added files, or remote-only files freshly
 * downloaded) take the on-disk digest.
 */
async function buildMergedBaseDigests(
  merged: CustomizationConfig,
  basePath: string,
  remoteDigests: CustomizationFileDigests,
  container: CustomizationThreeWayContainer,
): Promise<CustomizationFileDigests> {
  const mergedKeys = fileResourceKeys(merged);
  const fromDisk = new Set(
    [...mergedKeys].filter((key) => !remoteDigests.has(key)),
  );
  const diskDigests = await computeFileDigests(
    merged,
    basePath,
    container.fileContentReader,
    fromDisk,
  );

  const digests = new Map<string, ContentDigest>();
  for (const key of mergedKeys) {
    const digest = remoteDigests.get(key) ?? diskDigests.get(key);
    if (digest !== undefined) {
      digests.set(key, digest);
    }
  }
  return digests;
}

/**
 * Builds the path-preservation map for `captureCustomization`: bucket-qualified
 * key (`resourceKey(platform, category, FILE basename)`) → declared local
 * relative path. The composite key matches the merge identity so cross-bucket
 * same-basename files (e.g. `app/desktop/js/main.js` vs `app/mobile/js/main.js`)
 * stay distinct instead of colliding under a flat basename map. Only FILE
 * resources carry a path.
 */
function buildPreservePaths(
  config: CustomizationConfig,
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  const add = (
    platform: string,
    category: string,
    resources: readonly CustomizationResource[],
  ) => {
    for (const resource of resources) {
      if (resource.type === "FILE") {
        map.set(
          resourceKey(platform, category, resourceName(resource)),
          resource.path,
        );
      }
    }
  };
  add("desktop", "js", config.desktop.js);
  add("desktop", "css", config.desktop.css);
  add("mobile", "js", config.mobile.js);
  add("mobile", "css", config.mobile.css);
  return map;
}

type BucketFileResource = {
  readonly platform: string;
  readonly category: string;
  readonly resource: LocalFileResource;
};

/**
 * FILE resources paired with the bucket they live in, so the caller can rebuild
 * their `resourceKey` instead of collapsing them onto a bare basename.
 */
function allFileResources(config: CustomizationConfig): BucketFileResource[] {
  const all: BucketFileResource[] = [];
  const add = (
    platform: string,
    category: string,
    resources: readonly CustomizationResource[],
  ) => {
    for (const resource of resources) {
      if (resource.type === "FILE") {
        all.push({ platform, category, resource });
      }
    }
  };
  add("desktop", "js", config.desktop.js);
  add("desktop", "css", config.desktop.css);
  add("mobile", "js", config.mobile.js);
  add("mobile", "css", config.mobile.css);
  return all;
}

/**
 * Remote FILE `fileKey`s keyed by `resourceKey(platform, category, remote FILE
 * name)`. A flat basename map would make cross-bucket same-basename files
 * (e.g. `desktop/js/main.js` and `mobile/js/main.js`) resolve to whichever
 * bucket was registered last, overwriting one bucket's body with the other's.
 */
function remoteFileKeyMap(remote: RemoteCustomization): Map<string, string> {
  const map = new Map<string, string>();
  const add = (
    platform: string,
    category: string,
    resources: RemoteCustomization["desktop"]["js"],
  ) => {
    for (const r of resources) {
      if (r.type === "FILE") {
        map.set(
          resourceKey(platform, category, remoteResourceName(r)),
          r.file.fileKey,
        );
      }
    }
  };
  add("desktop", "js", remote.desktop.js);
  add("desktop", "css", remote.desktop.css);
  add("mobile", "js", remote.mobile.js);
  add("mobile", "css", remote.mobile.css);
  return map;
}
