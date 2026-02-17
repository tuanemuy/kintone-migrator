import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import type {
  GeneralNotification,
  GeneralNotificationConfig,
  NotificationConfig,
  PerRecordNotification,
  PerRecordNotificationTarget,
  ReminderNotification,
  ReminderNotificationConfig,
  ReminderNotificationTarget,
} from "../entity";
import { NotificationErrorCode } from "../errorCode";
import type {
  NotificationEntity,
  NotificationEntityType,
} from "../valueObject";

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "USER",
  "GROUP",
  "ORGANIZATION",
  "FIELD_ENTITY",
]);

function parseEntity(raw: unknown, context: string): NotificationEntity {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `${context}: entity must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== "string" || !VALID_ENTITY_TYPES.has(obj.type)) {
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

  return { type: obj.type as NotificationEntityType, code: obj.code };
}

function parseGeneralNotification(
  raw: unknown,
  index: number,
): GeneralNotification {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `General notification at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;
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
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"general" must be an object',
    );
  }

  const obj = raw as Record<string, unknown>;

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

function parsePerRecordTarget(
  raw: unknown,
  index: number,
): PerRecordNotificationTarget {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Per-record target at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;
  const entity = parseEntity(obj.entity, `Per-record target at index ${index}`);

  const result: PerRecordNotificationTarget = { entity };

  if (obj.includeSubs !== undefined && obj.includeSubs !== null) {
    return { ...result, includeSubs: Boolean(obj.includeSubs) };
  }

  return result;
}

function parsePerRecordNotification(
  raw: unknown,
  index: number,
): PerRecordNotification {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Per-record notification at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.targets)) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Per-record notification at index ${index} must have a "targets" array`,
    );
  }

  const targets = obj.targets.map((item: unknown, i: number) =>
    parsePerRecordTarget(item, i),
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

function parseReminderTarget(
  raw: unknown,
  index: number,
): ReminderNotificationTarget {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Reminder target at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;
  const entity = parseEntity(obj.entity, `Reminder target at index ${index}`);

  const result: ReminderNotificationTarget = { entity };

  if (obj.includeSubs !== undefined && obj.includeSubs !== null) {
    return { ...result, includeSubs: Boolean(obj.includeSubs) };
  }

  return result;
}

function parseReminderNotification(
  raw: unknown,
  index: number,
): ReminderNotification {
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      `Reminder notification at index ${index} must be an object`,
    );
  }

  const obj = raw as Record<string, unknown>;

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
    parseReminderTarget(item, i),
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
      hoursLater: typeof obj.hoursLater === "number" ? obj.hoursLater : 0,
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
  if (typeof raw !== "object" || raw === null) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtInvalidConfigStructure,
      '"reminder" must be an object',
    );
  }

  const obj = raw as Record<string, unknown>;

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
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        NotificationErrorCode.NtEmptyConfigText,
        "Notification config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        NotificationErrorCode.NtInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        NotificationErrorCode.NtInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed as Record<string, unknown>;

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
