import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { NotificationErrorCode } from "../../errorCode";
import { NotificationConfigParser } from "../configParser";

const validGeneralYaml = `
general:
  notifyToCommenter: true
  notifications:
    - entity:
        type: USER
        code: admin
      recordAdded: true
      recordEdited: false
      commentAdded: true
      statusChanged: false
      fileImported: false
`;

const validPerRecordYaml = `
perRecord:
  - filterCond: 'status = "open"'
    title: Open records
    targets:
      - entity:
          type: USER
          code: admin
`;

const validReminderYaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      filterCond: 'status = "open"'
      title: Due tomorrow
      targets:
        - entity:
            type: USER
            code: admin
`;

const validFullYaml = `
general:
  notifyToCommenter: true
  notifications:
    - entity:
        type: USER
        code: admin
      recordAdded: true
      recordEdited: false
      commentAdded: true
      statusChanged: false
      fileImported: false
perRecord:
  - filterCond: 'status = "open"'
    title: Open records
    targets:
      - entity:
          type: USER
          code: admin
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      filterCond: 'status = "open"'
      title: Due tomorrow
      targets:
        - entity:
            type: USER
            code: admin
`;

describe("NotificationConfigParser.parse", () => {
  it("3種類全部含む有効なYAMLをパースできる", () => {
    const config = NotificationConfigParser.parse(validFullYaml);

    expect(config.general).toBeDefined();
    expect(config.general?.notifyToCommenter).toBe(true);
    expect(config.general?.notifications).toHaveLength(1);
    expect(config.general?.notifications[0].entity).toEqual({
      type: "USER",
      code: "admin",
    });

    expect(config.perRecord).toBeDefined();
    expect(config.perRecord).toHaveLength(1);
    expect(config.perRecord?.[0].filterCond).toBe('status = "open"');

    expect(config.reminder).toBeDefined();
    expect(config.reminder?.timezone).toBe("Asia/Tokyo");
    expect(config.reminder?.notifications).toHaveLength(1);
    expect(config.reminder?.notifications[0].code).toBe("due_date");
  });

  it("generalのみをパースできる", () => {
    const config = NotificationConfigParser.parse(validGeneralYaml);

    expect(config.general).toBeDefined();
    expect(config.general?.notifyToCommenter).toBe(true);
    expect(config.perRecord).toBeUndefined();
    expect(config.reminder).toBeUndefined();
  });

  it("perRecordのみをパースできる", () => {
    const config = NotificationConfigParser.parse(validPerRecordYaml);

    expect(config.general).toBeUndefined();
    expect(config.perRecord).toBeDefined();
    expect(config.perRecord).toHaveLength(1);
    expect(config.reminder).toBeUndefined();
  });

  it("reminderのみをパースできる", () => {
    const config = NotificationConfigParser.parse(validReminderYaml);

    expect(config.general).toBeUndefined();
    expect(config.perRecord).toBeUndefined();
    expect(config.reminder).toBeDefined();
    expect(config.reminder?.notifications[0].daysLater).toBe(1);
  });

  it("includeSubsがundefinedの場合はプロパティが含まれない", () => {
    const config = NotificationConfigParser.parse(validGeneralYaml);
    const notification = config.general?.notifications[0];
    expect(notification?.includeSubs).toBeUndefined();
  });

  it("空のnotifications配列をパースできる", () => {
    const yaml = `
general:
  notifyToCommenter: false
  notifications: []
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.general?.notifications).toHaveLength(0);
  });

  it("ReminderのhoursLaterパターンをパースできる", () => {
    const config = NotificationConfigParser.parse(validReminderYaml);
    const notification = config.reminder?.notifications[0];
    expect(notification?.hoursLater).toBe(9);
    expect(notification?.time).toBeUndefined();
  });

  it("Reminderのtimeパターンをパースできる", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      time: "09:00"
      filterCond: ""
      title: Due tomorrow
      targets:
        - entity:
            type: USER
            code: admin
`;
    const config = NotificationConfigParser.parse(yaml);
    const notification = config.reminder?.notifications[0];
    expect(notification?.time).toBe("09:00");
    expect(notification?.hoursLater).toBeUndefined();
  });

  it("空テキストでNtEmptyConfigTextエラー", () => {
    try {
      NotificationConfigParser.parse("");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtEmptyConfigText,
      );
    }
  });

  it("無効なYAMLでNtInvalidConfigYamlエラー", () => {
    try {
      NotificationConfigParser.parse("{ invalid yaml: [");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtInvalidConfigYaml,
      );
    }
  });

  it("非オブジェクトでNtInvalidConfigStructureエラー", () => {
    try {
      NotificationConfigParser.parse("just a string");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtInvalidConfigStructure,
      );
    }
  });

  it("generalが非オブジェクトでNtInvalidConfigStructureエラー", () => {
    try {
      NotificationConfigParser.parse("general: not_an_object");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtInvalidConfigStructure,
      );
    }
  });

  it("perRecordが非配列でNtInvalidConfigStructureエラー", () => {
    try {
      NotificationConfigParser.parse("perRecord: not_an_array");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtInvalidConfigStructure,
      );
    }
  });

  it("reminderが非オブジェクトでNtInvalidConfigStructureエラー", () => {
    try {
      NotificationConfigParser.parse("reminder: not_an_object");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtInvalidConfigStructure,
      );
    }
  });

  it("無効なentity typeでNtInvalidEntityTypeエラー", () => {
    const yaml = `
general:
  notifyToCommenter: false
  notifications:
    - entity:
        type: INVALID
        code: admin
      recordAdded: true
      recordEdited: false
      commentAdded: false
      statusChanged: false
      fileImported: false
`;
    try {
      NotificationConfigParser.parse(yaml);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtInvalidEntityType,
      );
    }
  });

  it("空のentity codeでNtEmptyEntityCodeエラー", () => {
    const yaml = `
general:
  notifyToCommenter: false
  notifications:
    - entity:
        type: USER
        code: ""
      recordAdded: true
      recordEdited: false
      commentAdded: false
      statusChanged: false
      fileImported: false
`;
    try {
      NotificationConfigParser.parse(yaml);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtEmptyEntityCode,
      );
    }
  });

  it("perRecordのfilterCond未指定でNtMissingRequiredFieldエラー", () => {
    const yaml = `
perRecord:
  - title: Test
    targets:
      - entity:
          type: USER
          code: admin
`;
    try {
      NotificationConfigParser.parse(yaml);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtMissingRequiredField,
      );
    }
  });

  it("perRecordのtitle未指定で空文字列にデフォルトされる", () => {
    const yaml = `
perRecord:
  - filterCond: 'status = "open"'
    targets:
      - entity:
          type: USER
          code: admin
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.perRecord).toBeDefined();
    expect(config.perRecord?.[0].title).toBe("");
  });

  it("reminderのdaysLater未指定でNtMissingRequiredFieldエラー", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      hoursLater: 9
      filterCond: ""
      title: Due
      targets:
        - entity:
            type: USER
            code: admin
`;
    try {
      NotificationConfigParser.parse(yaml);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtMissingRequiredField,
      );
    }
  });

  it("reminderのcode未指定でエラー", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - daysLater: 1
      hoursLater: 9
      filterCond: ""
      title: Due
      targets:
        - entity:
            type: USER
            code: admin
`;
    try {
      NotificationConfigParser.parse(yaml);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtInvalidConfigStructure,
      );
    }
  });

  it("reminderのhoursLaterとtime両方指定でNtConflictingTimingFieldsエラー", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      time: "09:00"
      filterCond: ""
      title: Due
      targets:
        - entity:
            type: USER
            code: admin
`;
    try {
      NotificationConfigParser.parse(yaml);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtConflictingTimingFields,
      );
    }
  });
});
