import type { CustomizationConfig } from "@/core/domain/customization/entity";
import {
  type CustomizationThreeWayMerge,
  computeCustomizationThreeWayMerge,
  type EstimatedBaseKeys,
  fileResourceKeys,
  resolveBaseFileDigests,
} from "@/core/domain/customization/services/customizationMerge";
import type { CustomizationState } from "@/core/domain/customization/state";
import type { CustomizationFileDigests } from "@/core/domain/customization/valueObject";
import type { CustomizationThreeWayContainer } from "../container/customization";
import {
  computeFileDigests,
  computeRemoteFileDigests,
} from "./customizationDigests";
import type { CustomizationRemote } from "./loadCustomizationThreeWayInputs";

export type BuildCustomizationThreeWayMergeArgs = Readonly<{
  container: CustomizationThreeWayContainer;
  state: CustomizationState;
  /** App revision recorded alongside the base snapshot (undefined on first run). */
  baseRevision: string | undefined;
  local: CustomizationConfig;
  remote: CustomizationRemote;
  /** Base path the local FILE paths resolve against. */
  basePath: string;
  /**
   * Already-computed local digests (push digests its upload set up front). When
   * given, local files are not read again.
   */
  localDigests?: CustomizationFileDigests;
}>;

export type BuildCustomizationThreeWayMergeResult = Readonly<{
  merge: CustomizationThreeWayMerge;
  estimatedKeys: EstimatedBaseKeys;
  /**
   * Digests of the remote bodies that were fetched. `pull` records these as the
   * new base for keys the remote still holds, so a merge that keeps the local
   * side does not pretend the local content was already uploaded.
   */
  remoteDigests: CustomizationFileDigests;
  /**
   * Keys whose local body was needed for the classification but could not be
   * read from disk. Their digest is silently absent (see
   * `readLocalDigest`), so the caller reports them instead of letting the
   * resulting classification look like a real content change.
   */
  unreadableLocalKeys: ReadonlySet<string>;
}>;

/**
 * Assembles the customization 3-way merge shared by `diff`, `push` and `pull`.
 *
 * Only the contents that can change a classification are fetched: a key present
 * on one side alone is decided by existence, so local reads are limited to
 * `local ∩ (base ∪ remote)` and downloads to `remote ∩ (base ∪ local)`. Base
 * tags come from the snapshot's recorded digests, with
 * {@link resolveBaseFileDigests} filling in whatever was never recorded.
 */
export async function buildCustomizationThreeWayMerge({
  container,
  state,
  baseRevision,
  local,
  remote,
  basePath,
  localDigests: precomputedLocalDigests,
}: BuildCustomizationThreeWayMergeArgs): Promise<BuildCustomizationThreeWayMergeResult> {
  const baseKeys = fileResourceKeys(state.config);
  const localKeys = fileResourceKeys(local);
  const remoteKeys = fileResourceKeys(remote.config);

  const localNeeded = intersect(localKeys, union(baseKeys, remoteKeys));
  const remoteNeeded = intersect(remoteKeys, union(baseKeys, localKeys));

  const [localDigests, remoteDigests] = await Promise.all([
    precomputedLocalDigests !== undefined
      ? Promise.resolve(subset(precomputedLocalDigests, localNeeded))
      : computeFileDigests(
          local,
          basePath,
          container.fileContentReader,
          localNeeded,
        ),
    computeRemoteFileDigests(
      remote.raw,
      container.fileDownloader,
      remoteNeeded,
    ),
  ]);

  const { tags: baseTags, estimatedKeys } = resolveBaseFileDigests(
    state.config,
    state.fileDigests,
    localDigests,
    remoteDigests,
    {
      localKeys,
      remoteKeys,
      legacyState: state.fileDigests.size === 0,
      remoteUnchanged:
        baseRevision !== undefined && baseRevision === remote.revision,
    },
  );

  const merge = computeCustomizationThreeWayMerge(
    state.config,
    local,
    remote.config,
    { base: baseTags, local: localDigests, remote: remoteDigests },
  );

  const unreadableLocalKeys = difference(localNeeded, localDigests);

  return { merge, estimatedKeys, remoteDigests, unreadableLocalKeys };
}

function difference(
  keys: ReadonlySet<string>,
  digests: CustomizationFileDigests,
): Set<string> {
  return new Set([...keys].filter((key) => !digests.has(key)));
}

function union(a: ReadonlySet<string>, b: ReadonlySet<string>): Set<string> {
  return new Set([...a, ...b]);
}

function intersect(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
): Set<string> {
  const result = new Set<string>();
  for (const key of a) {
    if (b.has(key)) {
      result.add(key);
    }
  }
  return result;
}

function subset(
  digests: CustomizationFileDigests,
  keys: ReadonlySet<string>,
): CustomizationFileDigests {
  return new Map([...digests].filter(([key]) => keys.has(key)));
}
