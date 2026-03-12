import { describe, expect, it } from "vitest";
import type { NotificationConfig } from "../../entity";
import { NotificationConfigParser } from "../configParser";
import { NotificationConfigSerializer } from "../configSerializer";

const fullConfig: NotificationConfig = {
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
      targets: [{ entity: { type: "GROUP", code: "managers" } }],
    },
  ],
  reminder: {
    timezone: "Asia/Tokyo",
    notifications: [
      {
        code: "due_date",
        daysLater: 1,
        hoursLater: 9,
        filterCond: "",
        title: "Due tomorrow",
        targets: [
          {
            entity: { type: "ORGANIZATION", code: "dev" },
            includeSubs: true,
          },
        ],
      },
    ],
  },
};

describe("NotificationConfigSerializer.serialize", () => {
  it("3種類全部含むconfigをシリアライズできる", () => {
    const result = NotificationConfigSerializer.serialize(fullConfig);

    expect(result).toHaveProperty("general");
    expect(result).toHaveProperty("perRecord");
    expect(result).toHaveProperty("reminder");

    const general = result.general as Record<string, unknown>;
    expect(general.notifyToCommenter).toBe(true);

    const notifications = general.notifications as Record<string, unknown>[];
    expect((notifications[0].entity as Record<string, unknown>).code).toBe(
      "admin",
    );

    const perRecord = result.perRecord as Record<string, unknown>[];
    expect(
      (perRecord[0].targets as Record<string, unknown>[])[0],
    ).toHaveProperty("entity");

    const reminder = result.reminder as Record<string, unknown>;
    expect(reminder.timezone).toBe("Asia/Tokyo");
  });

  it("generalのみをシリアライズできる", () => {
    const config: NotificationConfig = {
      general: fullConfig.general,
    };
    const result = NotificationConfigSerializer.serialize(config);

    expect(result).toHaveProperty("general");
    expect(result).not.toHaveProperty("perRecord");
    expect(result).not.toHaveProperty("reminder");
  });

  it("perRecordのみをシリアライズできる", () => {
    const config: NotificationConfig = {
      perRecord: fullConfig.perRecord,
    };
    const result = NotificationConfigSerializer.serialize(config);

    expect(result).not.toHaveProperty("general");
    expect(result).toHaveProperty("perRecord");
    expect(result).not.toHaveProperty("reminder");
  });

  it("reminderのみをシリアライズできる", () => {
    const config: NotificationConfig = {
      reminder: fullConfig.reminder,
    };
    const result = NotificationConfigSerializer.serialize(config);

    expect(result).not.toHaveProperty("general");
    expect(result).not.toHaveProperty("perRecord");
    expect(result).toHaveProperty("reminder");
  });

  it("includeSubs falseをシリアライズできる", () => {
    const config: NotificationConfig = {
      general: {
        notifyToCommenter: false,
        notifications: [
          {
            entity: { type: "USER", code: "admin" },
            includeSubs: false,
            recordAdded: true,
            recordEdited: false,
            commentAdded: false,
            statusChanged: false,
            fileImported: false,
          },
        ],
      },
    };
    const result = NotificationConfigSerializer.serialize(config);
    const general = result.general as Record<string, unknown>;
    const notifications = general.notifications as Record<string, unknown>[];

    expect(notifications[0].includeSubs).toBe(false);
  });

  it("空のconfigをシリアライズできる", () => {
    const config: NotificationConfig = {};
    const result = NotificationConfigSerializer.serialize(config);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("perRecordのtargetにincludeSubsを含めてシリアライズできる", () => {
    const config: NotificationConfig = {
      perRecord: [
        {
          filterCond: "",
          title: "Test",
          targets: [
            {
              entity: { type: "GROUP", code: "group1" },
              includeSubs: true,
            },
          ],
        },
      ],
    };
    const result = NotificationConfigSerializer.serialize(config);
    const perRecord = result.perRecord as Record<string, unknown>[];
    const targets = perRecord[0].targets as Record<string, unknown>[];

    expect(targets[0].includeSubs).toBe(true);
  });

  it("reminderのtimeフィールドをシリアライズできる", () => {
    const config: NotificationConfig = {
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            time: "09:00",
            filterCond: "",
            title: "Due",
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
      },
    };
    const result = NotificationConfigSerializer.serialize(config);
    const reminder = result.reminder as Record<string, unknown>;
    const notifications = reminder.notifications as Record<string, unknown>[];

    expect(notifications[0]).toHaveProperty("time");
    expect(notifications[0].time).toBe("09:00");
    expect(notifications[0]).not.toHaveProperty("hoursLater");
  });

  it("reminderのtargetにincludeSubsを含めてシリアライズできる", () => {
    const config: NotificationConfig = {
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            hoursLater: 9,
            filterCond: "",
            title: "Due",
            targets: [
              {
                entity: { type: "GROUP", code: "group1" },
                includeSubs: false,
              },
            ],
          },
        ],
      },
    };
    const result = NotificationConfigSerializer.serialize(config);
    const reminder = result.reminder as Record<string, unknown>;
    const notifications = reminder.notifications as Record<string, unknown>[];
    const targets = notifications[0].targets as Record<string, unknown>[];

    expect(targets[0].includeSubs).toBe(false);
  });

  it("ラウンドトリップテスト: parse→serialize→parse→比較", () => {
    const result1 = NotificationConfigSerializer.serialize(fullConfig);
    const parsed1 = NotificationConfigParser.parse(result1);
    const result2 = NotificationConfigSerializer.serialize(parsed1);
    const parsed2 = NotificationConfigParser.parse(result2);

    expect(parsed2).toEqual(parsed1);
  });
});
