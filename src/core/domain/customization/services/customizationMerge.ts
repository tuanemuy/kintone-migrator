import { classifyThreeWay, type ThreeWayMergeResult } from "../../diff";
import { BusinessRuleError } from "../../error";
import type { CustomizationConfig } from "../entity";
import { CustomizationErrorCode } from "../errorCode";
import {
  type CustomizationFileDigests,
  type CustomizationFileTags,
  type CustomizationPlatform,
  type CustomizationResource,
  DEFAULT_CUSTOMIZATION_SCOPE,
} from "../valueObject";
import { resourceName } from "./diffDetector";

/**
 * 3-way merge for the customization domain (file-entity special case).
 *
 * Customization is the file-entity domain: the merge is **by resource name**
 * within each (platform, category) bucket — `desktop.js`, `desktop.css`,
 * `mobile.js`, `mobile.css` — plus a single `scope` value. Renames are modeled
 * as an old-name removal + new-name addition (expressible by `updateAppCustomize`,
 * which replaces the full js/css lists — so renames are NOT an
 * "inexpressible operation").
 *
 * FILE contents are compared through per-side content digests: each side's tag
 * is the digest of that side's file body, so {@link classifyThreeWay} tells
 * "only local moved away from base" (`localOnly`) from "only the remote moved"
 * (`remoteOnly`) and from a real two-sided divergence (`conflict`). Contents are
 * never merged line-by-line — the whole file is taken from the chosen side.
 *
 * A side with no digest for a key (content unreadable, or a base snapshot
 * written before digests existed) gets that side's `untracked:<side>` sentinel.
 * Base keys with no recorded digest are resolved by
 * {@link resolveBaseFileDigests} before the merge runs.
 *
 * The merged value carries the original resource so resolution flattens back to
 * the platform js/css lists in a stable order.
 */

/** Platform bucket of a customization config. */
export type CustomizationPlatformName = "desktop" | "mobile";
/** Resource category within a platform bucket. */
export type CustomizationCategoryName = "js" | "css";

type Side = "base" | "local" | "remote";

/**
 * Per-side placeholder for "no content digest for this key". Distinct per side
 * so an untracked key never compares equal across sides by accident.
 */
const UNTRACKED: Readonly<Record<Side, string>> = {
  base: "untracked:base",
  local: "untracked:local",
  remote: "untracked:remote",
};

/** The comparison tokens of all three sides, keyed by resource key. */
export type CustomizationMergeTags = Readonly<
  Record<Side, CustomizationFileTags>
>;

/** A resource slot in the merge keyed by `platform:category:name`. */
type ResourceEntry = Readonly<{
  resource: CustomizationResource;
  /** Equality token: same type, and (for FILE) a content marker. */
  tag: string;
}>;

/** The merged value: a resource entry, or the scope string. */
type MergeValue = ResourceEntry | { readonly scope: string };

export type CustomizationThreeWayMerge = ThreeWayMergeResult<
  string,
  MergeValue
>;

export type CustomizationMergeResolution = ReadonlyMap<
  string,
  "local" | "remote"
>;

/**
 * The bucket space every walk over a customization config must agree on.
 *
 * Shared rather than redeclared per module: the merge keys, the snapshot's
 * digest keys and the locally/remotely computed digest keys are only comparable
 * while they enumerate the same buckets, and a bucket missing from one walk
 * would not be a type error — it would silently leave digests unrecorded and
 * degrade the classification to an estimate.
 */
export const PLATFORMS: readonly CustomizationPlatformName[] = [
  "desktop",
  "mobile",
];
export const CATEGORIES: readonly CustomizationCategoryName[] = ["js", "css"];

const SCOPE_KEY = "config:scope";

/**
 * Bucket-qualified resource identity: `platform:category:name`. Shared with the
 * force/firstTime pull path (`preservePaths`) so path preservation matches the
 * merge on the same identity and cross-bucket same-basename files stay distinct.
 *
 * The bucket parameters are the bucket types rather than `string` so a typo or a
 * stale literal at a call site is a compile error instead of a key nobody ever
 * looks up.
 */
export function resourceKey(
  platform: CustomizationPlatformName,
  category: CustomizationCategoryName,
  name: string,
): string {
  return `${platform}:${category}:${name}`;
}

/**
 * The {@link resourceKey} of a remote FILE, from the name kintone reports.
 *
 * The remote name is normalized exactly like a local declared path, because the
 * remote config the merge is built from carries `file.name` as its `path`: a
 * name containing `/` becomes its trailing segment there, and a lookup keyed by
 * the raw name would miss the very entry it describes.
 */
export function remoteFileResourceKey(
  platform: CustomizationPlatformName,
  category: CustomizationCategoryName,
  fileName: string,
): string {
  return resourceKey(
    platform,
    category,
    resourceName({ type: "FILE", path: fileName }),
  );
}

/** A resource together with the bucket it was found in. */
export type BucketedResource<T> = Readonly<{
  platform: CustomizationPlatformName;
  category: CustomizationCategoryName;
  resource: T;
}>;

/** Anything shaped like a customization: two platforms of two resource lists. */
type BucketedResources<T> = Readonly<
  Record<
    CustomizationPlatformName,
    Readonly<Record<CustomizationCategoryName, readonly T[]>>
  >
>;

/**
 * Walks every (platform, category) bucket, tagging each resource with the bucket
 * it belongs to. Generic over the resource so the local config, the raw remote
 * shape and a merged config are all walked by the same code.
 *
 * Every key-producing walk goes through here: a hand-written enumeration that
 * misses a bucket is not a type error, and the symptom — digests silently left
 * unrecorded, downloads silently skipped — surfaces far from the cause.
 */
export function* walkCustomizationBuckets<T>(
  resources: BucketedResources<T>,
): Generator<BucketedResource<T>> {
  for (const platform of PLATFORMS) {
    for (const category of CATEGORIES) {
      for (const resource of resources[platform][category]) {
        yield { platform, category, resource };
      }
    }
  }
}

function platformList(
  config: CustomizationConfig,
  platform: CustomizationPlatformName,
  category: CustomizationCategoryName,
): readonly CustomizationResource[] {
  const p: CustomizationPlatform = config[platform];
  return category === "js" ? p.js : p.css;
}

/**
 * Builds the per-side map keyed by `platform:category:name`. A FILE's tag is its
 * content digest for this side, falling back to the side's untracked sentinel so
 * an unknown content never compares equal to another side's unknown content.
 */
function toMap(
  config: CustomizationConfig,
  tags: CustomizationFileTags,
  side: Side,
): Map<string, MergeValue> {
  const map = new Map<string, MergeValue>();
  for (const { platform, category, resource } of walkCustomizationBuckets(
    config,
  )) {
    const key = resourceKey(platform, category, resourceName(resource));
    const tag =
      resource.type === "FILE"
        ? `FILE:${tags.get(key) ?? UNTRACKED[side]}`
        : "URL";
    map.set(key, { resource, tag });
  }
  const scope = config.scope ?? DEFAULT_CUSTOMIZATION_SCOPE;
  map.set(SCOPE_KEY, { scope });
  return map;
}

/** The `resourceKey` set of every FILE resource in a config. */
export function fileResourceKeys(
  config: CustomizationConfig,
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const { platform, category, resource } of walkCustomizationBuckets(
    config,
  )) {
    if (resource.type === "FILE") {
      keys.add(resourceKey(platform, category, resourceName(resource)));
    }
  }
  return keys;
}

function isScopeValue(v: MergeValue): v is { readonly scope: string } {
  return "scope" in v;
}

function eq(a: MergeValue, b: MergeValue): boolean {
  if (isScopeValue(a) || isScopeValue(b)) {
    return isScopeValue(a) && isScopeValue(b) && a.scope === b.scope;
  }
  return a.tag === b.tag;
}

/**
 * Computes the resource-key-keyed 3-way merge of base/local/remote customization.
 *
 * `tags` carries each side's FILE content tokens (digests, or the base tags
 * produced by {@link resolveBaseFileDigests}). A key whose base tag equals the
 * local tag but not the remote tag is `remoteOnly`, and vice versa — so editing
 * a file locally is a local change, not a conflict.
 */
export function computeCustomizationThreeWayMerge(
  base: CustomizationConfig,
  local: CustomizationConfig,
  remote: CustomizationConfig,
  tags: CustomizationMergeTags,
): CustomizationThreeWayMerge {
  return classifyThreeWay(
    toMap(base, tags.base, "base"),
    toMap(local, tags.local, "local"),
    toMap(remote, tags.remote, "remote"),
    eq,
  );
}

export type ResolveBaseFileDigestsOptions = Readonly<{
  /** FILE keys present in the local config. */
  localKeys: ReadonlySet<string>;
  /** FILE keys present in the remote config. */
  remoteKeys: ReadonlySet<string>;
  /** The state records no digest at all (written before digests existed). */
  legacyState: boolean;
  /** The app revision has not advanced since the snapshot was written. */
  remoteUnchanged: boolean;
}>;

/**
 * Keys whose base tag was inferred rather than read from the snapshot, split by
 * which rule produced it. Both sets are restricted to keys that exist locally or
 * remotely, i.e. keys that can actually influence the classification.
 */
export type EstimatedBaseKeys = Readonly<{
  /** Rule 2: the remote content was optimistically assumed to be the base. */
  optimistic: ReadonlySet<string>;
  /** Rules 3-5: the classification reproduces the pre-digest behaviour. */
  conservative: ReadonlySet<string>;
}>;

export type ResolvedBaseFileTags = Readonly<{
  tags: CustomizationFileTags;
  estimatedKeys: EstimatedBaseKeys;
}>;

/**
 * Determines the base-side comparison tag of every FILE key in the base
 * snapshot, filling in the keys whose digest was never recorded.
 *
 * Rules, highest priority first:
 *
 * 1. a recorded digest wins — the classification is exact;
 * 2. otherwise, for a legacy state (no digest at all) whose app revision has not
 *    moved, the remote digest is assumed to still be the base content, so a
 *    purely local edit is `localOnly` instead of a spurious conflict;
 * 3. otherwise, when the key exists on exactly one side, the base takes that
 *    side's tag, so the classification is decided by existence alone;
 * 4. otherwise, when both sides carry the same tag, the base takes it
 *    (`unchanged`);
 * 5. otherwise the base gets its own sentinel — both sides diverged
 *    (`conflict`), or the key exists on neither side (`bothSame`).
 *
 * Rules 3-5 reproduce exactly what the pre-digest implementation classified, so
 * a state without digests never regresses.
 */
export function resolveBaseFileDigests(
  baseConfig: CustomizationConfig,
  baseDigests: CustomizationFileDigests,
  localDigests: CustomizationFileDigests,
  remoteDigests: CustomizationFileDigests,
  options: ResolveBaseFileDigestsOptions,
): ResolvedBaseFileTags {
  const tags = new Map<string, string>();
  const optimistic = new Set<string>();
  const conservative = new Set<string>();

  for (const key of fileResourceKeys(baseConfig)) {
    const recorded = baseDigests.get(key);
    if (recorded !== undefined) {
      tags.set(key, recorded);
      continue;
    }

    const inLocal = options.localKeys.has(key);
    const inRemote = options.remoteKeys.has(key);
    const classifiable = inLocal || inRemote;
    const remoteDigest = remoteDigests.get(key);

    if (
      options.legacyState &&
      options.remoteUnchanged &&
      remoteDigest !== undefined
    ) {
      tags.set(key, remoteDigest);
      if (classifiable) {
        optimistic.add(key);
      }
      continue;
    }

    const localTag = localDigests.get(key) ?? UNTRACKED.local;
    const remoteTag = remoteDigest ?? UNTRACKED.remote;
    if (inLocal !== inRemote) {
      tags.set(key, inLocal ? localTag : remoteTag);
    } else if (inLocal && localTag === remoteTag) {
      tags.set(key, localTag);
    } else {
      tags.set(key, UNTRACKED.base);
    }
    if (classifiable) {
      conservative.add(key);
    }
  }

  return { tags, estimatedKeys: { optimistic, conservative } };
}

/**
 * Applies a resolved 3-way merge, returning the merged customization config.
 *
 * Auto-merged entries take their `merged` value; conflicts take the chosen
 * side. The resulting resources are flattened back into per-platform js/css
 * lists, preserving the order they appear in the chosen/merged side. Throws a
 * BusinessRuleError when a conflict is left unresolved (programmer invariant).
 */
export function resolveCustomizationMerge(
  merge: CustomizationThreeWayMerge,
  resolution: CustomizationMergeResolution,
  local: CustomizationConfig,
  remote: CustomizationConfig,
): CustomizationConfig {
  const chosen = new Map<string, CustomizationResource>();
  let scope: string = DEFAULT_CUSTOMIZATION_SCOPE;

  for (const entry of merge.entries) {
    let value: MergeValue | undefined;
    if (entry.change.kind === "conflict") {
      const choice = resolution.get(entry.key);
      if (choice === undefined) {
        throw new BusinessRuleError(
          CustomizationErrorCode.CzUnresolvedConflict,
          `Unresolved conflict for "${entry.key}"`,
        );
      }
      value = choice === "local" ? entry.local : entry.remote;
    } else {
      value = entry.merged;
    }
    if (value === undefined) {
      continue;
    }
    if (isScopeValue(value)) {
      scope = value.scope;
    } else {
      chosen.set(entry.key, value.resource);
    }
  }

  return rebuild(chosen, scope, local, remote);
}

/**
 * Rebuilds the config from the chosen resource keys, ordering each bucket by the
 * resource's position in local first, then any remote-only resources, so the
 * resulting list is stable and matches the user's local ordering intent.
 *
 * `path` is a local-owned concern (the build-output location) that is orthogonal
 * to which content wins the merge: whenever a key exists locally, the local
 * resource (its declared path) is kept regardless of the chosen content side.
 * Only remote-only keys fall back to the chosen (remote/basename) resource.
 */
function rebuild(
  chosen: Map<string, CustomizationResource>,
  scope: string,
  local: CustomizationConfig,
  remote: CustomizationConfig,
): CustomizationConfig {
  function bucket(
    platform: CustomizationPlatformName,
    category: CustomizationCategoryName,
  ): CustomizationResource[] {
    const seen = new Set<string>();
    const out: CustomizationResource[] = [];
    const localByKey = new Map<string, CustomizationResource>();
    for (const resource of platformList(local, platform, category)) {
      localByKey.set(
        resourceKey(platform, category, resourceName(resource)),
        resource,
      );
    }
    const append = (resources: readonly CustomizationResource[]) => {
      for (const resource of resources) {
        const key = resourceKey(platform, category, resourceName(resource));
        if (seen.has(key)) continue;
        const picked = chosen.get(key);
        if (picked !== undefined) {
          out.push(localByKey.get(key) ?? picked);
          seen.add(key);
        }
      }
    };
    append(platformList(local, platform, category));
    append(platformList(remote, platform, category));
    return out;
  }

  return {
    scope: scope as CustomizationConfig["scope"],
    desktop: { js: bucket("desktop", "js"), css: bucket("desktop", "css") },
    mobile: { js: bucket("mobile", "js"), css: bucket("mobile", "css") },
  };
}
