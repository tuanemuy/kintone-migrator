import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { NotificationErrorCode } from "../../errorCode";
import { NotificationConfigParser } from "../configParser";

const validGeneral = {
  general: {
    notifyToCommenter: true,
    notifications: [
      {
        entity: { type: "USER", code: "admin" },
        recordAdded: true,
        recordEdited: false,
        commentAdded: true,
        statusChanged: false,
        fileImported: false,
      },
    ],
  },
};

const validPerRecord = {
  perRecord: [
    {
      filterCond: 'status = "open"',
      title: "Open records",
      targets: [{ entity: { type: "USER", code: "admin" } }],
    },
  ],
};

const validReminder = {
  reminder: {
    timezone: "Asia/Tokyo",
    notifications: [
      {
        code: "due_date",
        daysLater: 1,
        hoursLater: 9,
        filterCond: 'status = "open"',
        title: "Due tomorrow",
        targets: [{ entity: { type: "USER", code: "admin" } }],
      },
    ],
  },
};

const validFull = {
  general: {
    notifyToCommenter: true,
    notifications: [
      {
        entity: { type: "USER", code: "admin" },
        recordAdded: true,
        recordEdited: false,
        commentAdded: true,
        statusChanged: false,
        fileImported: false,
      },
    ],
  },
  perRecord: [
    {
      filterCond: 'status = "open"',
      title: "Open records",
      targets: [{ entity: { type: "USER", code: "admin" } }],
    },
  ],
  reminder: {
    timezone: "Asia/Tokyo",
    notifications: [
      {
        code: "due_date",
        daysLater: 1,
        hoursLater: 9,
        filterCond: 'status = "open"',
        title: "Due tomorrow",
        targets: [{ entity: { type: "USER", code: "admin" } }],
      },
    ],
  },
};

describe("NotificationConfigParser.parse", () => {
  it("3種類全部含む有効な入力をパースできる", () => {
    const config = NotificationConfigParser.parse(validFull);

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
    const config = NotificationConfigParser.parse(validGeneral);

    expect(config.general).toBeDefined();
    expect(config.general?.notifyToCommenter).toBe(true);
    expect(config.perRecord).toBeUndefined();
    expect(config.reminder).toBeUndefined();
  });

  it("perRecordのみをパースできる", () => {
    const config = NotificationConfigParser.parse(validPerRecord);

    expect(config.general).toBeUndefined();
    expect(config.perRecord).toBeDefined();
    expect(config.perRecord).toHaveLength(1);
    expect(config.reminder).toBeUndefined();
  });

  it("reminderのみをパースできる", () => {
    const config = NotificationConfigParser.parse(validReminder);

    expect(config.general).toBeUndefined();
    expect(config.perRecord).toBeUndefined();
    expect(config.reminder).toBeDefined();
    expect(config.reminder?.notifications[0].daysLater).toBe(1);
  });

  it("includeSubsがundefinedの場合はプロパティが含まれない", () => {
    const config = NotificationConfigParser.parse(validGeneral);
    const notification = config.general?.notifications[0];
    expect(notification?.includeSubs).toBeUndefined();
  });

  it("空のnotifications配列をパースできる", () => {
    const config = NotificationConfigParser.parse({
      general: {
        notifyToCommenter: false,
        notifications: [],
      },
    });
    expect(config.general?.notifications).toHaveLength(0);
  });

  it("ReminderのhoursLaterパターンをパースできる", () => {
    const config = NotificationConfigParser.parse(validReminder);
    const notification = config.reminder?.notifications[0];
    expect(notification?.hoursLater).toBe(9);
    expect(notification?.time).toBeUndefined();
  });

  it("Reminderのtimeパターンをパースできる", () => {
    const config = NotificationConfigParser.parse({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            time: "09:00",
            filterCond: "",
            title: "Due tomorrow",
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      },
    });
    const notification = config.reminder?.notifications[0];
    expect(notification?.time).toBe("09:00");
    expect(notification?.hoursLater).toBeUndefined();
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

  it("配列でNtInvalidConfigStructureエラー", () => {
    expect(() => NotificationConfigParser.parse(["item1"])).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(["item1"])).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("nullでNtInvalidConfigStructureエラー", () => {
    expect(() => NotificationConfigParser.parse(null)).toThrow(
      BusinessRuleError,
    );
    expect(() => NotificationConfigParser.parse(null)).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("generalが非オブジェクトでNtInvalidConfigStructureエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({ general: "not_an_object" }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({ general: "not_an_object" }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("perRecordが非配列でNtInvalidConfigStructureエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({ perRecord: "not_an_array" }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({ perRecord: "not_an_array" }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderが非オブジェクトでNtInvalidConfigStructureエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({ reminder: "not_an_object" }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({ reminder: "not_an_object" }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("無効なentity typeでNtInvalidEntityTypeエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: [
            {
              entity: { type: "INVALID", code: "admin" },
              recordAdded: true,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: [
            {
              entity: { type: "INVALID", code: "admin" },
              recordAdded: true,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidEntityType,
      }),
    );
  });

  it("空のentity codeでNtEmptyEntityCodeエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: [
            {
              entity: { type: "USER", code: "" },
              recordAdded: true,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: [
            {
              entity: { type: "USER", code: "" },
              recordAdded: true,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtEmptyEntityCode,
      }),
    );
  });

  it("perRecordのfilterCond未指定でNtMissingRequiredFieldエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        perRecord: [
          {
            title: "Test",
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        perRecord: [
          {
            title: "Test",
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtMissingRequiredField,
      }),
    );
  });

  it("perRecordのtitle未指定で空文字列にデフォルトされる", () => {
    const config = NotificationConfigParser.parse({
      perRecord: [
        {
          filterCond: 'status = "open"',
          targets: [{ entity: { type: "USER", code: "admin" } }],
        },
      ],
    });
    expect(config.perRecord).toBeDefined();
    expect(config.perRecord?.[0].title).toBe("");
  });

  it("reminderのdaysLater未指定でNtMissingRequiredFieldエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              hoursLater: 9,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              hoursLater: 9,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtMissingRequiredField,
      }),
    );
  });

  it("reminderのcode未指定でエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              daysLater: 1,
              hoursLater: 9,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              daysLater: 1,
              hoursLater: 9,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("generalのincludeSubsを指定できる", () => {
    const config = NotificationConfigParser.parse({
      general: {
        notifyToCommenter: false,
        notifications: [
          {
            entity: { type: "GROUP", code: "group1" },
            recordAdded: true,
            recordEdited: false,
            commentAdded: false,
            statusChanged: false,
            fileImported: false,
            includeSubs: true,
          },
        ],
      },
    });
    expect(config.general?.notifications[0].includeSubs).toBe(true);
  });

  it("perRecordのtargetにincludeSubsを指定できる", () => {
    const config = NotificationConfigParser.parse({
      perRecord: [
        {
          filterCond: 'status = "open"',
          targets: [
            {
              entity: { type: "ORGANIZATION", code: "org1" },
              includeSubs: true,
            },
          ],
        },
      ],
    });
    expect(config.perRecord?.[0].targets[0].includeSubs).toBe(true);
  });

  it("perRecordのtargetのincludeSubs省略時はundefined", () => {
    const config = NotificationConfigParser.parse({
      perRecord: [
        {
          filterCond: 'status = "open"',
          targets: [{ entity: { type: "USER", code: "admin" } }],
        },
      ],
    });
    expect(config.perRecord?.[0].targets[0].includeSubs).toBeUndefined();
  });

  it("reminderのtargetにincludeSubsを指定できる", () => {
    const config = NotificationConfigParser.parse({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            hoursLater: 9,
            targets: [
              {
                entity: { type: "GROUP", code: "group1" },
                includeSubs: true,
              },
            ],
          },
        ],
      },
    });
    expect(config.reminder?.notifications[0].targets[0].includeSubs).toBe(true);
  });

  it("reminderのhoursLater/time両方省略時はどちらもundefined", () => {
    const config = NotificationConfigParser.parse({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      },
    });
    const notification = config.reminder?.notifications[0];
    expect(notification?.hoursLater).toBeUndefined();
    expect(notification?.time).toBeUndefined();
  });

  it("reminderのfilterCond省略時は空文字列にデフォルトされる", () => {
    const config = NotificationConfigParser.parse({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            hoursLater: 9,
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      },
    });
    expect(config.reminder?.notifications[0].filterCond).toBe("");
  });

  it("reminderのtitle省略時は空文字列にデフォルトされる", () => {
    const config = NotificationConfigParser.parse({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            hoursLater: 9,
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      },
    });
    expect(config.reminder?.notifications[0].title).toBe("");
  });

  it("reminderのtimezone省略時はAsia/Tokyoにデフォルトされる", () => {
    const config = NotificationConfigParser.parse({
      reminder: {
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            hoursLater: 9,
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      },
    });
    expect(config.reminder?.timezone).toBe("Asia/Tokyo");
  });

  it("generalの通知が非オブジェクトでNtInvalidConfigStructureエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: ["not_an_object"],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: ["not_an_object"],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("generalのnotificationsが配列でない場合にエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: "not_an_array",
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: "not_an_array",
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("perRecordのnotificationが非オブジェクトでエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        perRecord: ["not_an_object"],
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        perRecord: ["not_an_object"],
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("perRecordのtargetsが配列でない場合にエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        perRecord: [
          {
            filterCond: 'status = "open"',
            targets: "not_an_array",
          },
        ],
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        perRecord: [
          {
            filterCond: 'status = "open"',
            targets: "not_an_array",
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("perRecordのtargetが非オブジェクトでエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        perRecord: [
          {
            filterCond: 'status = "open"',
            targets: ["not_an_object"],
          },
        ],
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        perRecord: [
          {
            filterCond: 'status = "open"',
            targets: ["not_an_object"],
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderの通知が非オブジェクトでエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          notifications: ["not_an_object"],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          notifications: ["not_an_object"],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderのnotificationsが配列でない場合にエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          notifications: "not_an_array",
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          notifications: "not_an_array",
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderのtargetsが配列でない場合にエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          notifications: [
            {
              code: "due_date",
              daysLater: 1,
              targets: "not_an_array",
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          notifications: [
            {
              code: "due_date",
              daysLater: 1,
              targets: "not_an_array",
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("entityが非オブジェクトでNtInvalidConfigStructureエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: [
            {
              entity: "not_an_object",
              recordAdded: true,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        general: {
          notifyToCommenter: false,
          notifications: [
            {
              entity: "not_an_object",
              recordAdded: true,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidConfigStructure,
      }),
    );
  });

  it("reminderのhoursLaterとtime両方指定でNtConflictingTimingFieldsエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: 1,
              hoursLater: 9,
              time: "09:00",
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: 1,
              hoursLater: 9,
              time: "09:00",
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtConflictingTimingFields,
      }),
    );
  });

  it("reminderのhoursLaterが非数値でNtInvalidHoursLaterエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: 1,
              hoursLater: "not_a_number",
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: 1,
              hoursLater: "not_a_number",
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidHoursLater,
      }),
    );
  });

  it("reminderのdaysLaterが負数でエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: -1,
              hoursLater: 9,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
  });

  it("reminderのhoursLaterが小数でエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: 1,
              hoursLater: 1.5,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
  });

  it("reminderのtimeが非文字列でエラー", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: 1,
              time: 900,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(BusinessRuleError);
  });

  it("should accept daysLater: 0 as valid", () => {
    const config = NotificationConfigParser.parse({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 0,
            hoursLater: 9,
            filterCond: "",
            title: "Due Today",
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      },
    });
    expect(config.reminder?.notifications[0].daysLater).toBe(0);
  });

  it("should throw NtInvalidDaysLater for fractional daysLater", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: 1.5,
              hoursLater: 9,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidDaysLater,
      }),
    );
  });

  it("should throw NtInvalidDaysLater for negative daysLater", () => {
    expect(() =>
      NotificationConfigParser.parse({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [
            {
              code: "due_date",
              daysLater: -1,
              hoursLater: 9,
              filterCond: "",
              title: "Due",
              targets: [{ entity: { type: "USER", code: "admin" } }],
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: NotificationErrorCode.NtInvalidDaysLater,
      }),
    );
  });

  it("should accept hoursLater: 0 as valid", () => {
    const config = NotificationConfigParser.parse({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            hoursLater: 0,
            filterCond: "",
            title: "Due",
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      },
    });
    expect(config.reminder?.notifications[0].hoursLater).toBe(0);
  });
});
