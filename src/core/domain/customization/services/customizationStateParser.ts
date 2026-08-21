import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
import { type ContentDigest, isContentDigest } from "@/lib/contentDigest";
import { CustomizationErrorCode } from "../errorCode";
import type { CustomizationState } from "../state";
import type { CustomizationFileDigests } from "../valueObject";
import { CustomizationConfigParser } from "./configParser";
import {
  CATEGORIES,
  type CustomizationCategoryName,
  type CustomizationPlatformName,
  PLATFORMS,
  resourceKey,
} from "./customizationMerge";
import { resourceName } from "./diffDetector";

/**
 * Collects the per-FILE `digest` entries into the merge's key space. The
 * structure itself is already validated by {@link CustomizationConfigParser},
 * so this pass only reads the extra key and rejects malformed values. A missing
 * `digest` means "untracked", not an error: a state file carrying no digest at
 * all parses into an empty map.
 */
function parseFileDigests(parsed: unknown): CustomizationFileDigests {
  const digests = new Map<string, ContentDigest>();
  if (!isRecord(parsed)) {
    return digests;
  }

  for (const platform of PLATFORMS) {
    const platformValue = parsed[platform];
    if (!isRecord(platformValue)) {
      continue;
    }
    for (const category of CATEGORIES) {
      const list = platformValue[category];
      if (!Array.isArray(list)) {
        continue;
      }
      for (const raw of list) {
        const entry = digestEntry(raw, platform, category);
        if (entry !== undefined) {
          digests.set(entry[0], entry[1]);
        }
      }
    }
  }

  return digests;
}

/** The `[resourceKey, digest]` pair of one serialized resource, if it has one. */
function digestEntry(
  raw: unknown,
  platform: CustomizationPlatformName,
  category: CustomizationCategoryName,
): [string, ContentDigest] | undefined {
  if (!isRecord(raw) || raw.type !== "FILE" || typeof raw.path !== "string") {
    return undefined;
  }
  const digest = raw.digest;
  if (digest === undefined || digest === null) {
    return undefined;
  }
  if (!isContentDigest(digest)) {
    throw new BusinessRuleError(
      CustomizationErrorCode.CzInvalidConfigStructure,
      `FILE resource "${raw.path}" has an invalid "digest": ${String(digest)}. Must be a "sha256:<64 lowercase hex chars>" string`,
    );
  }
  return [
    resourceKey(
      platform,
      category,
      resourceName({ type: "FILE", path: raw.path }),
    ),
    digest,
  ];
}

/**
 * Parses pre-parsed (codec-decoded) data into a {@link CustomizationState}.
 *
 * The inverse of {@link CustomizationStateSerializer}: the captured config is
 * parsed via the same {@link CustomizationConfigParser} as the local YAML, so
 * the base snapshot is validated identically, then the per-FILE `digest` keys
 * are collected into the snapshot's digest map.
 */
export const CustomizationStateParser = {
  parse: (parsed: unknown): CustomizationState => ({
    config: CustomizationConfigParser.parse(parsed),
    fileDigests: parseFileDigests(parsed),
  }),
};
