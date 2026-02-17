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
    const yaml = NotificationConfigSerializer.serialize(fullConfig);

    expect(yaml).toContain("general:");
    expect(yaml).toContain("perRecord:");
    expect(yaml).toContain("reminder:");
    expect(yaml).toContain("notifyToCommenter: true");
    expect(yaml).toContain("code: admin");
    expect(yaml).toContain("code: managers");
    expect(yaml).toContain("timezone: Asia/Tokyo");
  });

  it("generalのみをシリアライズできる", () => {
    const config: NotificationConfig = {
      general: fullConfig.general,
    };
    const yaml = NotificationConfigSerializer.serialize(config);

    expect(yaml).toContain("general:");
    expect(yaml).not.toContain("perRecord:");
    expect(yaml).not.toContain("reminder:");
  });

  it("perRecordのみをシリアライズできる", () => {
    const config: NotificationConfig = {
      perRecord: fullConfig.perRecord,
    };
    const yaml = NotificationConfigSerializer.serialize(config);

    expect(yaml).not.toContain("general:");
    expect(yaml).toContain("perRecord:");
    expect(yaml).not.toContain("reminder:");
  });

  it("reminderのみをシリアライズできる", () => {
    const config: NotificationConfig = {
      reminder: fullConfig.reminder,
    };
    const yaml = NotificationConfigSerializer.serialize(config);

    expect(yaml).not.toContain("general:");
    expect(yaml).not.toContain("perRecord:");
    expect(yaml).toContain("reminder:");
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
    const yaml = NotificationConfigSerializer.serialize(config);
    expect(yaml).toContain("includeSubs: false");
  });

  it("空のconfigをシリアライズできる", () => {
    const config: NotificationConfig = {};
    const yaml = NotificationConfigSerializer.serialize(config);
    expect(yaml.trim()).toBe("{}");
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
    const yaml = NotificationConfigSerializer.serialize(config);
    expect(yaml).toContain("includeSubs: true");
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
    const yaml = NotificationConfigSerializer.serialize(config);
    expect(yaml).toContain("time:");
    expect(yaml).toContain("09:00");
    expect(yaml).not.toContain("hoursLater");
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
    const yaml = NotificationConfigSerializer.serialize(config);
    expect(yaml).toContain("includeSubs: false");
  });

  it("ラウンドトリップテスト: parse→serialize→parse→比較", () => {
    const yaml1 = NotificationConfigSerializer.serialize(fullConfig);
    const parsed1 = NotificationConfigParser.parse(yaml1);
    const yaml2 = NotificationConfigSerializer.serialize(parsed1);
    const parsed2 = NotificationConfigParser.parse(yaml2);

    expect(parsed2).toEqual(parsed1);
  });
});
