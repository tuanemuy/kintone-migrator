import type { AppPermissionEntity } from "./valueObject";

export type AppRight = Readonly<{
  entity: AppPermissionEntity;
  includeSubs: boolean;
  appEditable: boolean;
  recordViewable: boolean;
  recordAddable: boolean;
  recordEditable: boolean;
  recordDeletable: boolean;
  recordImportable: boolean;
  recordExportable: boolean;
}>;

export type AppPermissionConfig = Readonly<{
  rights: readonly AppRight[];
}>;
