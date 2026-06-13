import { classifyThreeWay, type ThreeWayMergeResult } from "../../diff";
import { BusinessRuleError } from "../../error";
import type { CustomizationConfig } from "../entity";
import { CustomizationErrorCode } from "../errorCode";
import {
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
 * Same-name FILE conflicts: a file present on both sides whose **content
 * differs** (local vs remote, computed via the same `modifiedFileNames` set as
 * the 2-way diffDetector) is a file-unit conflict. This is encoded by giving the
 * local and remote sides distinct content tags so {@link classifyThreeWay}
 * classifies the key as `conflict`. File contents are never merged line-by-line
 * — the whole file is taken from the chosen side.
 *
 * The merged value carries the original resource so resolution flattens back to
 * the platform js/css lists in a stable order.
 */

type Platform = "desktop" | "mobile";
type Category = "js" | "css";

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

const PLATFORMS: readonly Platform[] = ["desktop", "mobile"];
const CATEGORIES: readonly Category[] = ["js", "css"];
const SCOPE_KEY = "config:scope";

function resourceKey(
  platform: Platform,
  category: Category,
  name: string,
): string {
  return `${platform}:${category}:${name}`;
}

function platformList(
  config: CustomizationConfig,
  platform: Platform,
  category: Category,
): readonly CustomizationResource[] {
  const p: CustomizationPlatform = config[platform];
  return category === "js" ? p.js : p.css;
}

/**
 * Builds the per-side map keyed by `platform:category:name`. `contentTag`
 * returns the content marker for a same-name FILE so divergent content surfaces
 * as a conflict. `side` distinguishes local vs remote tags for modified files.
 */
function toMap(
  config: CustomizationConfig,
  contentTag: (name: string) => string,
): Map<string, MergeValue> {
  const map = new Map<string, MergeValue>();
  for (const platform of PLATFORMS) {
    for (const category of CATEGORIES) {
      for (const resource of platformList(config, platform, category)) {
        const name = resourceName(resource);
        const tag =
          resource.type === "FILE" ? `FILE:${contentTag(name)}` : "URL";
        map.set(resourceKey(platform, category, name), { resource, tag });
      }
    }
  }
  const scope = config.scope ?? DEFAULT_CUSTOMIZATION_SCOPE;
  map.set(SCOPE_KEY, { scope });
  return map;
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
 * Computes the file-name-keyed 3-way merge of base/local/remote customization.
 *
 * `modifiedFileNames` is the set of same-name FILE basenames whose local
 * content differs from the remote content (reused from the diffDetector flow).
 * Such files get distinct local/remote tags so they classify as conflicts; all
 * other matched files share the `"same"` tag and classify as unchanged.
 */
export function computeCustomizationThreeWayMerge(
  base: CustomizationConfig,
  local: CustomizationConfig,
  remote: CustomizationConfig,
  modifiedFileNames: ReadonlySet<string>,
): CustomizationThreeWayMerge {
  const tagFor = (side: string) => (name: string) =>
    modifiedFileNames.has(name) ? side : "same";

  return classifyThreeWay(
    toMap(base, () => "same"),
    toMap(local, tagFor("local")),
    toMap(remote, tagFor("remote")),
    eq,
  );
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
 */
function rebuild(
  chosen: Map<string, CustomizationResource>,
  scope: string,
  local: CustomizationConfig,
  remote: CustomizationConfig,
): CustomizationConfig {
  function bucket(
    platform: Platform,
    category: Category,
  ): CustomizationResource[] {
    const seen = new Set<string>();
    const out: CustomizationResource[] = [];
    const append = (resources: readonly CustomizationResource[]) => {
      for (const resource of resources) {
        const key = resourceKey(platform, category, resourceName(resource));
        if (seen.has(key)) continue;
        const picked = chosen.get(key);
        if (picked !== undefined) {
          out.push(picked);
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
