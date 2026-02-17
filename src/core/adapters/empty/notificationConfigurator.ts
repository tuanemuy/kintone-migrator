import { SystemError, SystemErrorCode } from "@/core/application/error";
import type {
  GeneralNotification,
  PerRecordNotification,
  ReminderNotification,
} from "@/core/domain/notification/entity";
import type { NotificationConfigurator } from "@/core/domain/notification/ports/notificationConfigurator";

export class EmptyNotificationConfigurator implements NotificationConfigurator {
  async getGeneralNotifications(): Promise<{
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyNotificationConfigurator.getGeneralNotifications not implemented",
    );
  }

  async updateGeneralNotifications(_params: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyNotificationConfigurator.updateGeneralNotifications not implemented",
    );
  }

  async getPerRecordNotifications(): Promise<{
    notifications: readonly PerRecordNotification[];
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyNotificationConfigurator.getPerRecordNotifications not implemented",
    );
  }

  async updatePerRecordNotifications(_params: {
    notifications: readonly PerRecordNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyNotificationConfigurator.updatePerRecordNotifications not implemented",
    );
  }

  async getReminderNotifications(): Promise<{
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyNotificationConfigurator.getReminderNotifications not implemented",
    );
  }

  async updateReminderNotifications(_params: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyNotificationConfigurator.updateReminderNotifications not implemented",
    );
  }
}
