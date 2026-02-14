export type FieldRightAccessibility = "READ" | "WRITE" | "NONE";

export type EntityType = "USER" | "GROUP" | "ORGANIZATION" | "FIELD_ENTITY";

export type FieldPermissionEntity = Readonly<{
  type: EntityType;
  code: string;
}>;

export type FieldRightEntity = Readonly<{
  accessibility: FieldRightAccessibility;
  entity: FieldPermissionEntity;
  includeSubs?: boolean;
}>;
