import { resolve } from "node:path";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import {
  type CustomizationMergeResolution,
  type CustomizationThreeWayMerge,
  computeCustomizationThreeWayMerge,
  resolveCustomizationMerge,
} from "@/core/domain/customization/services/customizationMerge";
import {
  remoteResourceName,
  resourceName,
} from "@/core/domain/customization/services/diffDetector";
import type {
  LocalFileResource,
  RemoteCustomization,
} from "@/core/domain/customization/valueObject";
import type { CustomizationThreeWayServiceArgs } from "../container/customization";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { captureCustomization } from "./captureCustomization";
import { computeModifiedFileNames } from "./customizationRemote";
import { saveCustomizationSnapshotAndRevision } from "./customizationStateIo";
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
    };

/**
 * First stage of `customize pull` (AC-9 / AC-11).
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
  const { state, local, remote } =
    await loadCustomizationThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    // Capture-equivalent: download remote file bodies, write config + files.
    const captured = await captureCustomization({
      container,
      input: { basePath: input.captureBasePath, filePrefix: input.filePrefix },
    });
    await container.customizationStorage.update(captured.configText);
    await saveCustomizationSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return { mode: input.force ? "force" : "firstTime" };
  }

  const modifiedFileNames = await computeModifiedFileNames(
    local,
    remote.raw,
    input.basePath,
    container,
  );
  const merge = computeCustomizationThreeWayMerge(
    state,
    local,
    remote.config,
    modifiedFileNames,
  );

  return {
    mode: "merged",
    merge,
    local,
    remote: remote.raw,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
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
};

/**
 * Second stage of `customize pull`: applies a resolved 3-way merge.
 *
 * Reconstructs the merged config (file names), downloads the bodies of every
 * FILE resource that did NOT already exist locally with the same name (i.e.
 * remote-only / remote-side conflict resolutions), writes the merged config
 * YAML, and updates the base to the remote snapshot/revision. Files already on
 * disk (local-only or local-side resolutions) are left as-is. Called only after
 * the CLI has resolved all conflicts; never invoked on abort (AC-11).
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

  // File names whose body must be taken from the remote: every `remoteOnly`
  // entry plus every conflict resolved to `remote`. (`localOnly` / `bothSame` /
  // `unchanged` keep the local on-disk copy — same content, no re-download.)
  const fromRemote = new Set<string>();
  for (const entry of input.merge.entries) {
    const name = nameFromKey(entry.key);
    if (name === undefined) continue;
    if (entry.change.kind === "remoteOnly") {
      fromRemote.add(name);
    } else if (
      entry.change.kind === "conflict" &&
      input.resolution.get(entry.key) === "remote"
    ) {
      fromRemote.add(name);
    }
  }

  // Remote fileKey lookup by basename for files we must download.
  const remoteFileKeys = remoteFileKeyMap(input.remote);

  const downloads: Promise<void>[] = [];
  for (const resource of allFileResources(merged)) {
    const name = resourceName(resource);
    if (!fromRemote.has(name)) {
      continue;
    }
    const fileKey = remoteFileKeys.get(name);
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
  await saveCustomizationSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
}

function allFileResources(config: CustomizationConfig): LocalFileResource[] {
  const all = [
    ...config.desktop.js,
    ...config.desktop.css,
    ...config.mobile.js,
    ...config.mobile.css,
  ];
  return all.filter((r): r is LocalFileResource => r.type === "FILE");
}

/**
 * Extracts the file/resource name from a merge key. Resource keys are
 * `platform:category:name`; the `config:scope` key has no resource name.
 */
function nameFromKey(key: string): string | undefined {
  const parts = key.split(":");
  if (parts.length < 3) return undefined;
  return parts.slice(2).join(":");
}

function remoteFileKeyMap(remote: RemoteCustomization): Map<string, string> {
  const map = new Map<string, string>();
  const add = (resources: RemoteCustomization["desktop"]["js"]) => {
    for (const r of resources) {
      if (r.type === "FILE") {
        map.set(remoteResourceName(r), r.file.fileKey);
      }
    }
  };
  add(remote.desktop.js);
  add(remote.desktop.css);
  add(remote.mobile.js);
  add(remote.mobile.css);
  return map;
}
