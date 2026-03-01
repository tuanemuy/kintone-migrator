import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import { isRecord } from "@/core/domain/typeGuards";
import type {
  GeneralNotification,
  GeneralNotificationConfig,
  NotificationConfig,
  NotificationTarget,
  PerRecordNotification,
  ReminderNotification,
  ReminderNotificationConfig,
} from "../entity";
import { NotificationErrorCode } from "../errorCode";
import type { NotificationEntity } from "../valueObject";
import { isNotificationEntityType } from "../valueObject";

function parseEntity(raw: unknown, context: string): NotificationEntity {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `${context}: entity must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.type !== "string" || !isNotificationEntityType(obj.type)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidEntityType,
      `${context}: entity has invalid type: ${String(obj.type)}. Must be USER, GROUP, ORGANIZATION, or FIELD_ENTITY`,
    );
  }

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtEmptyEntityCode,
      `${context}: entity must have a non-empty "code" property`,
    );
  }

  return { type: obj.type, code: obj.code };
}

function parseGeneralNotification(
  raw: unknown,
  index: number,
): GeneralNotification {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `General notification at index ${index} must be an object`,
    );
  }

  const obj = raw;
  const entity = parseEntity(
    obj.entity,
    `General notification at index ${index}`,
  );

  const result: GeneralNotification = {
    entity,
    recordAdded: Boolean(obj.recordAdded),
    recordEdited: Boolean(obj.recordEdited),
    commentAdded: Boolean(obj.commentAdded),
    statusChanged: Boolean(obj.statusChanged),
    fileImported: Boolean(obj.fileImported),
  };

  if (obj.includeSubs !== undefined && obj.includeSubs !== null) {
    return { ...result, includeSubs: Boolean(obj.includeSubs) };
  }

  return result;
}

function parseGeneralConfig(raw: unknown): GeneralNotificationConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"general" must be an object',
    );
  }

  const obj = raw;

  if (!Array.isArray(obj.notifications)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"general" must have a "notifications" array',
    );
  }

  const notifications = obj.notifications.map((item: unknown, i: number) =>
    parseGeneralNotification(item, i),
  );

  return {
    notifyToCommenter: Boolean(obj.notifyToCommenter),
    notifications,
  };
}

function parseTarget(
  raw: unknown,
  index: number,
  context: string,
): NotificationTarget {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `${context} target at index ${index} must be an object`,
    );
  }

  const obj = raw;
  const entity = parseEntity(obj.entity, `${context} target at index ${index}`);

  const result: NotificationTarget = { entity };

  if (obj.includeSubs !== undefined && obj.includeSubs !== null) {
    return { ...result, includeSubs: Boolean(obj.includeSubs) };
  }

  return result;
}

function parsePerRecordNotification(
  raw: unknown,
  index: number,
): PerRecordNotification {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Per-record notification at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (!Array.isArray(obj.targets)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Per-record notification at index ${index} must have a "targets" array`,
    );
  }

  const targets = obj.targets.map((item: unknown, i: number) =>
    parseTarget(item, i, "Per-record"),
  );

  if (typeof obj.filterCond !== "string") {
    throw new BusinessRuleError(
      NotificationErrorCode.NtMissingRequiredField,
      `Per-record notification at index ${index} must have a "filterCond" string property`,
    );
  }

  return {
    filterCond: obj.filterCond,
    title: typeof obj.title === "string" ? obj.title : "",
    targets,
  };
}

function parsePerRecordConfig(raw: unknown): readonly PerRecordNotification[] {
  if (!Array.isArray(raw)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"perRecord" must be an array',
    );
  }

  return raw.map((item: unknown, i: number) =>
    parsePerRecordNotification(item, i),
  );
}

function parseReminderNotification(
  raw: unknown,
  index: number,
): ReminderNotification {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Reminder notification at index ${index} must be an object`,
    );
  }

  const obj = raw;

  if (typeof obj.code !== "string" || obj.code.length === 0) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Reminder notification at index ${index} must have a non-empty "code" property`,
    );
  }

  if (!Array.isArray(obj.targets)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Reminder notification at index ${index} must have a "targets" array`,
    );
  }

  const targets = obj.targets.map((item: unknown, i: number) =>
    parseTarget(item, i, "Reminder"),
  );

  if (typeof obj.daysLater !== "number") {
    throw new BusinessRuleError(
      NotificationErrorCode.NtMissingRequiredField,
      `Reminder notification at index ${index} must have a "daysLater" number property`,
    );
  }

  const hasHoursLater = obj.hoursLater !== undefined && obj.hoursLater !== null;
  const hasTime = obj.time !== undefined && obj.time !== null;

  if (hasHoursLater && hasTime) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtConflictingTimingFields,
      `Reminder notification at index ${index} must not have both "hoursLater" and "time"`,
    );
  }

  // Issue 3.5: Validate that hoursLater is a number when present
  if (hasHoursLater && typeof obj.hoursLater !== "number") {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidHoursLater,
      `Reminder notification at index ${index} has non-numeric "hoursLater": ${String(obj.hoursLater)}`,
    );
  }

  const result: ReminderNotification = {
    code: obj.code,
    daysLater: obj.daysLater,
    filterCond: typeof obj.filterCond === "string" ? obj.filterCond : "",
    title: typeof obj.title === "string" ? obj.title : "",
    targets,
  };

  if (hasHoursLater) {
    return {
      ...result,
      hoursLater: obj.hoursLater as number,
    };
  }

  if (hasTime) {
    return {
      ...result,
      time: typeof obj.time === "string" ? obj.time : "",
    };
  }

  return result;
}

function parseReminderConfig(raw: unknown): ReminderNotificationConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"reminder" must be an object',
    );
  }

  const obj = raw;

  if (!Array.isArray(obj.notifications)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"reminder" must have a "notifications" array',
    );
  }

  const notifications = obj.notifications.map((item: unknown, i: number) =>
    parseReminderNotification(item, i),
  );

  return {
    timezone: typeof obj.timezone === "string" ? obj.timezone : "Asia/Tokyo",
    notifications,
  };
}

export const NotificationConfigParser = {
  parse: (rawText: string): NotificationConfig => {
    const obj = parseYamlConfig(
      rawText,
      {
        emptyConfigText: NotificationErrorCode.NtEmptyConfigText,
        invalidConfigYaml: NotificationErrorCode.NtInvalidConfigYaml,
        invalidConfigStructure: NotificationErrorCode.NtInvalidConfigStructure,
      },
      "Notification",
    );

    const config: {
      general?: GeneralNotificationConfig;
      perRecord?: readonly PerRecordNotification[];
      reminder?: ReminderNotificationConfig;
    } = {};

    if (obj.general !== undefined) {
      config.general = parseGeneralConfig(obj.general);
    }

    if (obj.perRecord !== undefined) {
      config.perRecord = parsePerRecordConfig(obj.perRecord);
    }

    if (obj.reminder !== undefined) {
      config.reminder = parseReminderConfig(obj.reminder);
    }

    return config;
  },
};
