export type RecordPermissionEntityType =
  | "USER"
  | "GROUP"
  | "ORGANIZATION"
  | "FIELD_ENTITY";

export type RecordPermissionEntity = Readonly<{
  type: RecordPermissionEntityType;
  code: string;
}>;

export type RecordPermissionRightEntity = Readonly<{
  entity: RecordPermissionEntity;
  viewable: boolean;
  editable: boolean;
  deletable: boolean;
  includeSubs: boolean;
}>;
