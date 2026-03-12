import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "@/core/domain/services/configValidator";
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

  if (typeof raw.type !== "string" || !isNotificationEntityType(raw.type)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidEntityType,
      `${context}: entity has invalid type: ${String(raw.type)}. Must be USER, GROUP, ORGANIZATION, or FIELD_ENTITY`,
    );
  }

  if (typeof raw.code !== "string" || raw.code.length === 0) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtEmptyEntityCode,
      `${context}: entity must have a non-empty "code" property`,
    );
  }

  return { type: raw.type, code: raw.code };
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

  const entity = parseEntity(
    raw.entity,
    `General notification at index ${index}`,
  );

  const result: GeneralNotification = {
    entity,
    recordAdded: Boolean(raw.recordAdded),
    recordEdited: Boolean(raw.recordEdited),
    commentAdded: Boolean(raw.commentAdded),
    statusChanged: Boolean(raw.statusChanged),
    fileImported: Boolean(raw.fileImported),
  };

  if (raw.includeSubs !== undefined && raw.includeSubs !== null) {
    return { ...result, includeSubs: Boolean(raw.includeSubs) };
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

  if (!Array.isArray(raw.notifications)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"general" must have a "notifications" array',
    );
  }

  const notifications = raw.notifications.map((item: unknown, i: number) =>
    parseGeneralNotification(item, i),
  );

  return {
    notifyToCommenter: Boolean(raw.notifyToCommenter),
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

  const entity = parseEntity(raw.entity, `${context} target at index ${index}`);

  const result: NotificationTarget = { entity };

  if (raw.includeSubs !== undefined && raw.includeSubs !== null) {
    return { ...result, includeSubs: Boolean(raw.includeSubs) };
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

  if (!Array.isArray(raw.targets)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Per-record notification at index ${index} must have a "targets" array`,
    );
  }

  const targets = raw.targets.map((item: unknown, i: number) =>
    parseTarget(item, i, "Per-record"),
  );

  if (typeof raw.filterCond !== "string") {
    throw new BusinessRuleError(
      NotificationErrorCode.NtMissingRequiredField,
      `Per-record notification at index ${index} must have a "filterCond" string property`,
    );
  }

  return {
    filterCond: raw.filterCond,
    title: typeof raw.title === "string" ? raw.title : "",
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

  if (typeof raw.code !== "string" || raw.code.length === 0) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Reminder notification at index ${index} must have a non-empty "code" property`,
    );
  }

  if (!Array.isArray(raw.targets)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Reminder notification at index ${index} must have a "targets" array`,
    );
  }

  const targets = raw.targets.map((item: unknown, i: number) =>
    parseTarget(item, i, "Reminder"),
  );

  if (typeof raw.daysLater !== "number") {
    throw new BusinessRuleError(
      NotificationErrorCode.NtMissingRequiredField,
      `Reminder notification at index ${index} must have a "daysLater" property`,
    );
  }

  if (!Number.isInteger(raw.daysLater) || raw.daysLater < 0) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidDaysLater,
      `Reminder notification at index ${index} has invalid "daysLater": ${raw.daysLater}. Must be a non-negative integer`,
    );
  }

  const hasHoursLater = raw.hoursLater !== undefined && raw.hoursLater !== null;
  const hasTime = raw.time !== undefined && raw.time !== null;

  if (hasHoursLater && hasTime) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtConflictingTimingFields,
      `Reminder notification at index ${index} must not have both "hoursLater" and "time"`,
    );
  }

  // Validate that hoursLater is a non-negative integer when present
  if (
    hasHoursLater &&
    (typeof raw.hoursLater !== "number" ||
      !Number.isInteger(raw.hoursLater) ||
      raw.hoursLater < 0)
  ) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidHoursLater,
      `Reminder notification at index ${index} has invalid "hoursLater": ${String(raw.hoursLater)}. Must be a non-negative integer`,
    );
  }

  // Validate that time is a string when present
  if (hasTime && typeof raw.time !== "string") {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Reminder notification at index ${index} has non-string "time": ${String(raw.time)}`,
    );
  }

  const result: ReminderNotification = {
    code: raw.code,
    daysLater: raw.daysLater,
    filterCond: typeof raw.filterCond === "string" ? raw.filterCond : "",
    title: typeof raw.title === "string" ? raw.title : "",
    targets,
  };

  if (hasHoursLater && typeof raw.hoursLater === "number") {
    return {
      ...result,
      hoursLater: raw.hoursLater,
    };
  }

  if (hasTime) {
    return {
      ...result,
      time: typeof raw.time === "string" ? raw.time : "",
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

  if (!Array.isArray(raw.notifications)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"reminder" must have a "notifications" array',
    );
  }

  const notifications = raw.notifications.map((item: unknown, i: number) =>
    parseReminderNotification(item, i),
  );

  return {
    timezone: typeof raw.timezone === "string" ? raw.timezone : "Asia/Tokyo",
    notifications,
  };
}

export const NotificationConfigParser = {
  parse: (parsed: unknown): NotificationConfig => {
    const obj = validateParsedConfig(
      parsed,
      NotificationErrorCode.NtInvalidConfigStructure,
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
