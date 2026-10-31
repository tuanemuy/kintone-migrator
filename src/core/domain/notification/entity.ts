import { formatValue } from "../services/formatValue";
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

export type PerRecordNotification = Readonly<{
  filterCond: string;
  title: string;
  targets: readonly NotificationTarget[];
}>;

/**
 * Display name of a per-record notification: the title as a name, otherwise
 * the filterCond quoted as a value so that it is distinguishable from a title
 * and its extent is readable.
 */
export function describePerRecordNotification(
  notif: PerRecordNotification,
): string {
  if (notif.title !== "") return notif.title;
  if (notif.filterCond !== "") return formatValue(notif.filterCond);
  return "(empty filter)";
}

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
  /**
   * Reminder timezone. Absent means unset: kintone returns `null` for an app
   * whose reminders were never saved, and a local config without it does not
   * manage the timezone (it is neither compared nor sent).
   */
  timezone?: string;
  notifications: readonly ReminderNotification[];
}>;

export type NotificationConfig = Readonly<{
  general?: GeneralNotificationConfig;
  perRecord?: readonly PerRecordNotification[];
  reminder?: ReminderNotificationConfig;
}>;
