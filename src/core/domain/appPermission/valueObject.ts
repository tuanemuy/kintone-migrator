export type AppPermissionEntityType =
  | "USER"
  | "GROUP"
  | "ORGANIZATION"
  | "CREATOR";

export type AppPermissionEntity = Readonly<{
  type: AppPermissionEntityType;
  code: string;
}>;
