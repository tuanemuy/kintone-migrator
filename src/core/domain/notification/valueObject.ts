export type NotificationEntityType =
  | "USER"
  | "GROUP"
  | "ORGANIZATION"
  | "FIELD_ENTITY";

export type NotificationEntity = Readonly<{
  type: NotificationEntityType;
  code: string;
}>;
