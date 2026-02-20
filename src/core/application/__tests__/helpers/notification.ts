import type { NotificationContainer } from "@/core/application/container/notification";
import type {
  GeneralNotification,
  PerRecordNotification,
  ReminderNotification,
} from "@/core/domain/notification/entity";
import type { NotificationConfigurator } from "@/core/domain/notification/ports/notificationConfigurator";
import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import {
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
  TestDouble,
} from "./shared";

export class InMemoryNotificationConfigurator
  extends TestDouble
  implements NotificationConfigurator
{
  private generalNotifications: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  } = {
    notifyToCommenter: false,
    notifications: [],
    revision: "1",
  };
  private perRecordNotifications: {
    notifications: readonly PerRecordNotification[];
    revision: string;
  } = {
    notifications: [],
    revision: "1",
  };
  private reminderNotifications: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  } = {
    timezone: "Asia/Tokyo",
    notifications: [],
    revision: "1",
  };
  lastUpdateGeneralParams: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision?: string;
  } | null = null;
  lastUpdatePerRecordParams: {
    notifications: readonly PerRecordNotification[];
    revision?: string;
  } | null = null;
  lastUpdateReminderParams: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision?: string;
  } | null = null;

  async getGeneralNotifications(): Promise<{
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  }> {
    this.callLog.push("getGeneralNotifications");
    this.checkFail("getGeneralNotifications");
    return { ...this.generalNotifications };
  }

  async updateGeneralNotifications(params: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateGeneralNotifications");
    this.checkFail("updateGeneralNotifications");
    this.lastUpdateGeneralParams = params;
    const newRevision = String(Number(this.generalNotifications.revision) + 1);
    this.generalNotifications.revision = newRevision;
    return { revision: newRevision };
  }

  async getPerRecordNotifications(): Promise<{
    notifications: readonly PerRecordNotification[];
    revision: string;
  }> {
    this.callLog.push("getPerRecordNotifications");
    this.checkFail("getPerRecordNotifications");
    return { ...this.perRecordNotifications };
  }

  async updatePerRecordNotifications(params: {
    notifications: readonly PerRecordNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updatePerRecordNotifications");
    this.checkFail("updatePerRecordNotifications");
    this.lastUpdatePerRecordParams = params;
    const newRevision = String(
      Number(this.perRecordNotifications.revision) + 1,
    );
    this.perRecordNotifications.revision = newRevision;
    return { revision: newRevision };
  }

  async getReminderNotifications(): Promise<{
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  }> {
    this.callLog.push("getReminderNotifications");
    this.checkFail("getReminderNotifications");
    return { ...this.reminderNotifications };
  }

  async updateReminderNotifications(params: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateReminderNotifications");
    this.checkFail("updateReminderNotifications");
    this.lastUpdateReminderParams = params;
    const newRevision = String(Number(this.reminderNotifications.revision) + 1);
    this.reminderNotifications.revision = newRevision;
    return { revision: newRevision };
  }

  setGeneralNotifications(data: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  }): void {
    this.generalNotifications = data;
  }

  setPerRecordNotifications(data: {
    notifications: readonly PerRecordNotification[];
    revision: string;
  }): void {
    this.perRecordNotifications = data;
  }

  setReminderNotifications(data: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  }): void {
    this.reminderNotifications = data;
  }
}

export class InMemoryNotificationStorage
  extends InMemoryFileStorage
  implements NotificationStorage {}

export type TestNotificationContainer = NotificationContainer & {
  notificationConfigurator: InMemoryNotificationConfigurator;
  notificationStorage: InMemoryNotificationStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestNotificationContainer(): TestNotificationContainer {
  return {
    notificationConfigurator: new InMemoryNotificationConfigurator(),
    notificationStorage: new InMemoryNotificationStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestNotificationContainer(): () => TestNotificationContainer {
  return setupContainer(createTestNotificationContainer);
}
