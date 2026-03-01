import type { DiffResult } from "../diff";

export const SCOPES = ["ALL", "ADMIN", "NONE"] as const;

export type CustomizationScope = (typeof SCOPES)[number];

export const VALID_SCOPES: ReadonlySet<string> = new Set(SCOPES);

export function isCustomizationScope(
  value: string,
): value is CustomizationScope {
  return VALID_SCOPES.has(value);
}

export const RESOURCE_TYPES = ["FILE", "URL"] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const VALID_RESOURCE_TYPES: ReadonlySet<string> = new Set(
  RESOURCE_TYPES,
);

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
