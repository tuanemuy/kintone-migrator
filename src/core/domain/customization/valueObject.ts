import type { DiffResult } from "../diff";

export type CustomizationScope = "ALL" | "ADMIN" | "NONE";

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

export type CustomizationDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  platform: "desktop" | "mobile" | "config";
  resourceType: "js" | "css" | "scope";
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
