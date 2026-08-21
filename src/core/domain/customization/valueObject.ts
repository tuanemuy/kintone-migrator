import type { ContentDigest } from "@/lib/contentDigest";
import type { DiffResult } from "../diff";

export type { ContentDigest };

/**
 * Content fingerprints of FILE resources, persisted in the base snapshot.
 *
 * Keyed by `resourceKey(platform, category, basename)` — the same identity the
 * 3-way merge uses. A key that is absent is *untracked* (its content was not
 * recorded), which is distinct from a file whose content is empty.
 */
export type CustomizationFileDigests = ReadonlyMap<string, ContentDigest>;

/**
 * Comparison tokens fed to the 3-way merge. Never persisted: besides digests,
 * a tag may be an `untracked:<side>` sentinel standing for "no content known
 * for this side". {@link CustomizationFileDigests} is assignable here, but not
 * the other way around, so a sentinel can never reach the state file.
 */
export type CustomizationFileTags = ReadonlyMap<string, string>;

export const SCOPES = ["ALL", "ADMIN", "NONE"] as const;

export type CustomizationScope = (typeof SCOPES)[number];

const VALID_SCOPES: ReadonlySet<string> = new Set(SCOPES);

export function isCustomizationScope(
  value: string,
): value is CustomizationScope {
  return VALID_SCOPES.has(value);
}

export const RESOURCE_TYPES = ["FILE", "URL"] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

const VALID_RESOURCE_TYPES: ReadonlySet<string> = new Set(RESOURCE_TYPES);

export function isResourceType(value: string): value is ResourceType {
  return VALID_RESOURCE_TYPES.has(value);
}

export type LocalFileResource = Readonly<{
  type: "FILE";
  path: string;
}>;

export type UrlResource = Readonly<{
  type: "URL";
  url: string;
}>;

export type CustomizationResource = LocalFileResource | UrlResource;

export type UploadedFileResource = Readonly<{
  type: "FILE";
  fileKey: string;
  name: string;
}>;

export type ResolvedResource = UploadedFileResource | UrlResource;

export type RemoteFileResource = Readonly<{
  type: "FILE";
  file: Readonly<{
    fileKey: string;
    name: string;
    contentType: string;
    size: string;
  }>;
}>;

export type RemoteResource = RemoteFileResource | UrlResource;

export type CustomizationPlatform = Readonly<{
  js: readonly CustomizationResource[];
  css: readonly CustomizationResource[];
}>;

export type ResolvedPlatform = Readonly<{
  js: readonly ResolvedResource[];
  css: readonly ResolvedResource[];
}>;

export type RemotePlatform = Readonly<{
  js: readonly RemoteResource[];
  css: readonly RemoteResource[];
}>;

export type CustomizationDiffCategory = "js" | "css" | "scope";

export type CustomizationDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  platform: "desktop" | "mobile" | "config";
  category: CustomizationDiffCategory;
  name: string;
  details: string;
}>;

export type CustomizationDiff = DiffResult<CustomizationDiffEntry>;

export const DEFAULT_CUSTOMIZATION_SCOPE: CustomizationScope = "ALL";

export type RemoteCustomization = Readonly<{
  scope: CustomizationScope;
  desktop: RemotePlatform;
  mobile: RemotePlatform;
}>;
