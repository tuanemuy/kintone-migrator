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
    expect(() => NotificationConfigParser.parse("")).toThrow(BusinessRuleError);
    expect(() => NotificationConfigParser.parse("")).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtEmptyConfigText,
      }),
    );
  });

  it("無効なYAMLでNtInvalidConfigYamlエラー", () => {
    expect(() => NotificationConfigParser.parse("{ invalid yaml: [")).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse("{ invalid yaml: [")).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigYaml,
      }),
    );
  });

  it("非オブジェクトでNtInvalidConfigStructureエラー", () => {
    expect(() => NotificationConfigParser.parse("just a string")).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse("just a string")).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("generalが非オブジェクトでNtInvalidConfigStructureエラー", () => {
    expect(() =>
      NotificationConfigParser.parse("general: not_an_object"),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse("general: not_an_object"),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("perRecordが非配列でNtInvalidConfigStructureエラー", () => {
    expect(() =>
      NotificationConfigParser.parse("perRecord: not_an_array"),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse("perRecord: not_an_array"),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderが非オブジェクトでNtInvalidConfigStructureエラー", () => {
    expect(() =>
      NotificationConfigParser.parse("reminder: not_an_object"),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse("reminder: not_an_object"),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
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
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidEntityType,
      }),
    );
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
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtEmptyEntityCode,
      }),
    );
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
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtMissingRequiredField,
      }),
    );
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
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtMissingRequiredField,
      }),
    );
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
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("generalのincludeSubsを指定できる", () => {
    const yaml = `
general:
  notifyToCommenter: false
  notifications:
    - entity:
        type: GROUP
        code: group1
      recordAdded: true
      recordEdited: false
      commentAdded: false
      statusChanged: false
      fileImported: false
      includeSubs: true
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.general?.notifications[0].includeSubs).toBe(true);
  });

  it("perRecordのtargetにincludeSubsを指定できる", () => {
    const yaml = `
perRecord:
  - filterCond: 'status = "open"'
    targets:
      - entity:
          type: ORGANIZATION
          code: org1
        includeSubs: true
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.perRecord?.[0].targets[0].includeSubs).toBe(true);
  });

  it("perRecordのtargetのincludeSubs省略時はundefined", () => {
    const yaml = `
perRecord:
  - filterCond: 'status = "open"'
    targets:
      - entity:
          type: USER
          code: admin
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.perRecord?.[0].targets[0].includeSubs).toBeUndefined();
  });

  it("reminderのtargetにincludeSubsを指定できる", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      targets:
        - entity:
            type: GROUP
            code: group1
          includeSubs: true
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.reminder?.notifications[0].targets[0].includeSubs).toBe(true);
  });

  it("reminderのhoursLater/time両方省略時はどちらもundefined", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      targets:
        - entity:
            type: USER
            code: admin
`;
    const config = NotificationConfigParser.parse(yaml);
    const notification = config.reminder?.notifications[0];
    expect(notification?.hoursLater).toBeUndefined();
    expect(notification?.time).toBeUndefined();
  });

  it("reminderのfilterCond省略時は空文字列にデフォルトされる", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      targets:
        - entity:
            type: USER
            code: admin
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.reminder?.notifications[0].filterCond).toBe("");
  });

  it("reminderのtitle省略時は空文字列にデフォルトされる", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      targets:
        - entity:
            type: USER
            code: admin
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.reminder?.notifications[0].title).toBe("");
  });

  it("reminderのtimezone省略時はAsia/Tokyoにデフォルトされる", () => {
    const yaml = `
reminder:
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      targets:
        - entity:
            type: USER
            code: admin
`;
    const config = NotificationConfigParser.parse(yaml);
    expect(config.reminder?.timezone).toBe("Asia/Tokyo");
  });

  it("generalの通知が非オブジェクトでNtInvalidConfigStructureエラー", () => {
    const yaml = `
general:
  notifyToCommenter: false
  notifications:
    - not_an_object
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("generalのnotificationsが配列でない場合にエラー", () => {
    const yaml = `
general:
  notifyToCommenter: false
  notifications: not_an_array
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("perRecordのnotificationが非オブジェクトでエラー", () => {
    const yaml = `
perRecord:
  - not_an_object
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("perRecordのtargetsが配列でない場合にエラー", () => {
    const yaml = `
perRecord:
  - filterCond: 'status = "open"'
    targets: not_an_array
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("perRecordのtargetが非オブジェクトでエラー", () => {
    const yaml = `
perRecord:
  - filterCond: 'status = "open"'
    targets:
      - not_an_object
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderの通知が非オブジェクトでエラー", () => {
    const yaml = `
reminder:
  notifications:
    - not_an_object
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderのnotificationsが配列でない場合にエラー", () => {
    const yaml = `
reminder:
  notifications: not_an_array
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderのtargetsが配列でない場合にエラー", () => {
    const yaml = `
reminder:
  notifications:
    - code: due_date
      daysLater: 1
      targets: not_an_array
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("entityが非オブジェクトでNtInvalidConfigStructureエラー", () => {
    const yaml = `
general:
  notifyToCommenter: false
  notifications:
    - entity: not_an_object
      recordAdded: true
      recordEdited: false
      commentAdded: false
      statusChanged: false
      fileImported: false
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
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
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtConflictingTimingFields,
      }),
    );
  });

  it("reminderのhoursLaterが非数値でNtInvalidHoursLaterエラー", () => {
    const yaml = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: "not_a_number"
      filterCond: ""
      title: Due
      targets:
        - entity:
            type: USER
            code: admin
`;
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(yaml)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidHoursLater,
      }),
    );
  });
});
