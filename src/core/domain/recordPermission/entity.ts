import type { RecordPermissionRightEntity } from "./valueObject";

export type RecordRight = Readonly<{
  filterCond: string;
  entities: readonly RecordPermissionRightEntity[];
}>;

export type RecordPermissionConfig = Readonly<{
  rights: readonly RecordRight[];
}>;
