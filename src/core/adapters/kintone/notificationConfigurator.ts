import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type {
  GeneralNotification,
  NotificationTarget,
  PerRecordNotification,
  ReminderNotification,
} from "@/core/domain/notification/entity";
import type { NotificationConfigurator } from "@/core/domain/notification/ports/notificationConfigurator";
import type { NotificationEntity } from "@/core/domain/notification/valueObject";
import { isNotificationEntityType } from "@/core/domain/notification/valueObject";

type KintoneNotificationEntity = {
  type: string;
  code: string;
};

type KintoneGeneralNotification = {
  entity: KintoneNotificationEntity;
  includeSubs?: boolean;
  recordAdded: boolean;
  recordEdited: boolean;
  commentAdded: boolean;
  statusChanged: boolean;
  fileImported: boolean;
};

type KintonePerRecordTarget = {
  entity: KintoneNotificationEntity;
  includeSubs?: boolean;
};

type KintonePerRecordNotification = {
  filterCond: string;
  title: string;
  targets: KintonePerRecordTarget[];
};

type KintoneReminderTarget = {
  entity: KintoneNotificationEntity;
  includeSubs?: boolean;
};

type KintoneReminderNotification = {
  timing:
    | { code: string; daysLater: string; hoursLater: string }
    | { code: string; daysLater: string; time: string };
  filterCond: string;
  title: string;
  targets: KintoneReminderTarget[];
};

function fromKintoneEntity(raw: KintoneNotificationEntity): NotificationEntity {
  if (!isNotificationEntityType(raw.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected entity type from kintone API (entity): ${raw.type}`,
    );
  }
  return { type: raw.type, code: raw.code };
}

function fromKintoneGeneralNotification(
  raw: KintoneGeneralNotification,
): GeneralNotification {
  const entity = fromKintoneEntity(raw.entity);

  const result: GeneralNotification = {
    entity,
    recordAdded: raw.recordAdded,
    recordEdited: raw.recordEdited,
    commentAdded: raw.commentAdded,
    statusChanged: raw.statusChanged,
    fileImported: raw.fileImported,
  };

  if (raw.includeSubs !== undefined) {
    return { ...result, includeSubs: raw.includeSubs };
  }

  return result;
}

function fromKintonePerRecordTarget(
  raw: KintonePerRecordTarget,
): NotificationTarget {
  const entity = fromKintoneEntity(raw.entity);

  const result: NotificationTarget = { entity };

  if (raw.includeSubs !== undefined) {
    return { ...result, includeSubs: raw.includeSubs };
  }

  return result;
}

function fromKintonePerRecordNotification(
  raw: KintonePerRecordNotification,
): PerRecordNotification {
  return {
    filterCond: raw.filterCond,
    title: raw.title,
    targets: raw.targets.map(fromKintonePerRecordTarget),
  };
}

function fromKintoneReminderTarget(
  raw: KintoneReminderTarget,
): NotificationTarget {
  const entity = fromKintoneEntity(raw.entity);

  const result: NotificationTarget = { entity };

  if (raw.includeSubs !== undefined) {
    return { ...result, includeSubs: raw.includeSubs };
  }

  return result;
}

function fromKintoneReminderNotification(
  raw: KintoneReminderNotification,
): ReminderNotification {
  const result: ReminderNotification = {
    code: raw.timing.code,
    daysLater: Number(raw.timing.daysLater),
    filterCond: raw.filterCond,
    title: raw.title,
    targets: raw.targets.map(fromKintoneReminderTarget),
  };

  if ("hoursLater" in raw.timing) {
    return { ...result, hoursLater: Number(raw.timing.hoursLater) };
  }

  if ("time" in raw.timing) {
    return { ...result, time: raw.timing.time };
  }

  throw new SystemError(
    SystemErrorCode.ExternalApiError,
    `Reminder notification for field "${result.code}" has timing with neither "hoursLater" nor "time"`,
  );
}

function toKintoneEntity(entity: NotificationEntity): Record<string, unknown> {
  return {
    type: entity.type,
    code: entity.code,
  };
}

function toKintoneGeneralNotification(
  notification: GeneralNotification,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    entity: toKintoneEntity(notification.entity),
    recordAdded: notification.recordAdded,
    recordEdited: notification.recordEdited,
    commentAdded: notification.commentAdded,
    statusChanged: notification.statusChanged,
    fileImported: notification.fileImported,
  };

  if (notification.includeSubs !== undefined) {
    result.includeSubs = notification.includeSubs;
  }

  return result;
}

function toKintonePerRecordTarget(
  target: NotificationTarget,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    entity: toKintoneEntity(target.entity),
  };

  if (target.includeSubs !== undefined) {
    result.includeSubs = target.includeSubs;
  }

  return result;
}

function toKintonePerRecordNotification(
  notification: PerRecordNotification,
): Record<string, unknown> {
  return {
    filterCond: notification.filterCond,
    title: notification.title,
    targets: notification.targets.map(toKintonePerRecordTarget),
  };
}

function toKintoneReminderTarget(
  target: NotificationTarget,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    entity: toKintoneEntity(target.entity),
  };

  if (target.includeSubs !== undefined) {
    result.includeSubs = target.includeSubs;
  }

  return result;
}

function toKintoneReminderNotification(
  notification: ReminderNotification,
): Record<string, unknown> {
  if (
    notification.hoursLater !== undefined &&
    notification.time !== undefined
  ) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Reminder notification "${notification.code}" must not have both "hoursLater" and "time"`,
    );
  }

  const timing: Record<string, unknown> = {
    code: notification.code,
    daysLater: String(notification.daysLater),
  };

  if (notification.hoursLater !== undefined) {
    timing.hoursLater = String(notification.hoursLater);
  }

  if (notification.time !== undefined) {
    timing.time = notification.time;
  }

  return {
    timing,
    filterCond: notification.filterCond,
    title: notification.title,
    targets: notification.targets.map(toKintoneReminderTarget),
  };
}

export class KintoneNotificationConfigurator
  implements NotificationConfigurator
{
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getGeneralNotifications(): Promise<{
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  }> {
    try {
      const response = await this.client.app.getGeneralNotifications({
        app: this.appId,
        preview: true,
      });

      const notifications = (
        response.notifications as KintoneGeneralNotification[]
      ).map(fromKintoneGeneralNotification);

      return {
        notifyToCommenter: response.notifyToCommenter as boolean,
        notifications,
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get general notifications",
        error,
      );
    }
  }

  async updateGeneralNotifications(params: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const requestParams: Record<string, unknown> = {
        app: this.appId,
        notifyToCommenter: params.notifyToCommenter,
        notifications: params.notifications.map(toKintoneGeneralNotification),
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateGeneralNotifications(
        requestParams as Parameters<
          typeof this.client.app.updateGeneralNotifications
        >[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update general notifications",
        error,
      );
    }
  }

  async getPerRecordNotifications(): Promise<{
    notifications: readonly PerRecordNotification[];
    revision: string;
  }> {
    try {
      const response = await this.client.app.getPerRecordNotifications({
        app: this.appId,
        preview: true,
      });

      const notifications = (
        response.notifications as KintonePerRecordNotification[]
      ).map(fromKintonePerRecordNotification);

      return {
        notifications,
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get per-record notifications",
        error,
      );
    }
  }

  async updatePerRecordNotifications(params: {
    notifications: readonly PerRecordNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const requestParams: Record<string, unknown> = {
        app: this.appId,
        notifications: params.notifications.map(toKintonePerRecordNotification),
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updatePerRecordNotifications(
        requestParams as Parameters<
          typeof this.client.app.updatePerRecordNotifications
        >[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update per-record notifications",
        error,
      );
    }
  }

  async getReminderNotifications(): Promise<{
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  }> {
    try {
      const response = await this.client.app.getReminderNotifications({
        app: this.appId,
        preview: true,
      });

      // Double cast is required because the SDK's type for reminder notifications
      // does not match the actual API response shape (e.g. timing field structure).
      // We cast through `unknown` to our local KintoneReminderNotification type
      // which accurately reflects the runtime data.
      const notifications = (
        response.notifications as unknown as KintoneReminderNotification[]
      ).map(fromKintoneReminderNotification);

      return {
        timezone: response.timezone as string,
        notifications,
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get reminder notifications",
        error,
      );
    }
  }

  async updateReminderNotifications(params: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const requestParams: Record<string, unknown> = {
        app: this.appId,
        timezone: params.timezone,
        notifications: params.notifications.map(toKintoneReminderNotification),
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateReminderNotifications(
        requestParams as Parameters<
          typeof this.client.app.updateReminderNotifications
        >[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update reminder notifications",
        error,
      );
    }
  }
}
