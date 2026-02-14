import type { FieldRightEntity } from "./valueObject";

export type FieldRight = Readonly<{
  code: string;
  entities: readonly FieldRightEntity[];
}>;

export type FieldPermissionConfig = Readonly<{
  rights: readonly FieldRight[];
}>;
