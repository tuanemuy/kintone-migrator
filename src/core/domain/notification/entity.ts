import type { NotificationEntity } from "./valueObject";

export type GeneralNotification = Readonly<{
  entity: NotificationEntity;
  includeSubs?: boolean;
  recordAdded: boolean;
  recordEdited: boolean;
  commentAdded: boolean;
  statusChanged: boolean;
  fileImported: boolean;
}>;

export type GeneralNotificationConfig = Readonly<{
  notifyToCommenter: boolean;
  notifications: readonly GeneralNotification[];
}>;

export type NotificationTarget = Readonly<{
  entity: NotificationEntity;
  includeSubs?: boolean;
}>;

export type PerRecordNotificationTarget = NotificationTarget;

export type PerRecordNotification = Readonly<{
  filterCond: string;
  title: string;
  targets: readonly NotificationTarget[];
}>;

export type ReminderNotificationTarget = NotificationTarget;

export type ReminderNotification = Readonly<{
  code: string;
  daysLater: number;
  hoursLater?: number;
  time?: string;
  filterCond: string;
  title: string;
  targets: readonly NotificationTarget[];
}>;

export type ReminderNotificationConfig = Readonly<{
  timezone: string;
  notifications: readonly ReminderNotification[];
}>;

export type NotificationConfig = Readonly<{
  general?: GeneralNotificationConfig;
  perRecord?: readonly PerRecordNotification[];
  reminder?: ReminderNotificationConfig;
}>;
