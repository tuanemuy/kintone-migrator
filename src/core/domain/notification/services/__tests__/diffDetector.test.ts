import { describe, expect, it } from "vitest";
import type {
  GeneralNotificationConfig,
  NotificationConfig,
  PerRecordNotification,
  ReminderNotification,
  ReminderNotificationConfig,
} from "../../entity";
import { NotificationDiffDetector } from "../diffDetector";

function makeGeneralConfig(
  overrides: Partial<GeneralNotificationConfig> = {},
): GeneralNotificationConfig {
  return {
    notifyToCommenter: true,
    notifications: [],
    ...overrides,
  };
}

function makePerRecord(
  overrides: Partial<PerRecordNotification> = {},
): PerRecordNotification {
  return {
    filterCond: 'status = "active"',
    title: "Test notification",
    targets: [],
    ...overrides,
  };
}

function makeReminder(
  overrides: Partial<ReminderNotification> = {},
): ReminderNotification {
  return {
    code: "reminder1",
    daysLater: 1,
    filterCond: "",
    title: "Reminder",
    targets: [],
    ...overrides,
  };
}

function makeReminderConfig(
  overrides: Partial<ReminderNotificationConfig> = {},
): ReminderNotificationConfig {
  return {
    timezone: "Asia/Tokyo",
    notifications: [],
    ...overrides,
  };
}

describe("NotificationDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const config: NotificationConfig = {
        general: makeGeneralConfig(),
        perRecord: [],
        reminder: makeReminderConfig(),
      };
      const result = NotificationDiffDetector.detect(config, config);
      expect(result.isEmpty).toBe(true);
    });

    it("should return empty diff when both are empty", () => {
      const result = NotificationDiffDetector.detect({}, {});
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("general section", () => {
    it("should detect notifyToCommenter change", () => {
      const local: NotificationConfig = {
        general: makeGeneralConfig({ notifyToCommenter: false }),
      };
      const remote: NotificationConfig = {
        general: makeGeneralConfig({ notifyToCommenter: true }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].section).toBe("general");
      expect(result.entries[0].name).toBe("notifyToCommenter");
    });

    it("should detect added general notification", () => {
      const local: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [
            {
              entity: { type: "USER", code: "user1" },
              recordAdded: true,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        }),
      };
      const remote: NotificationConfig = {
        general: makeGeneralConfig(),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].section).toBe("general");
    });

    it("should detect deleted general notification entity", () => {
      const local: NotificationConfig = {
        general: makeGeneralConfig(),
      };
      const remote: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [
            {
              entity: { type: "USER", code: "user1" },
              recordAdded: true,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].section).toBe("general");
    });

    it("should detect recordAdded property change", () => {
      const base = {
        entity: { type: "USER" as const, code: "user1" },
        recordEdited: false,
        commentAdded: false,
        statusChanged: false,
        fileImported: false,
      };
      const local: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [{ ...base, recordAdded: true }],
        }),
      };
      const remote: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [{ ...base, recordAdded: false }],
        }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("recordAdded");
    });

    it("should detect includeSubs property change", () => {
      const base = {
        entity: { type: "USER" as const, code: "user1" },
        recordAdded: true,
        recordEdited: false,
        commentAdded: false,
        statusChanged: false,
        fileImported: false,
      };
      const local: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [{ ...base, includeSubs: true }],
        }),
      };
      const remote: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [{ ...base, includeSubs: false }],
        }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("includeSubs");
    });

    it("should not report includeSubs diff between undefined and false", () => {
      const base = {
        entity: { type: "USER" as const, code: "user1" },
        recordAdded: true,
        recordEdited: false,
        commentAdded: false,
        statusChanged: false,
        fileImported: false,
      };
      const local: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [{ ...base }],
        }),
      };
      const remote: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [{ ...base, includeSubs: false }],
        }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
    });

    it("should detect multiple property changes simultaneously", () => {
      const base = {
        entity: { type: "USER" as const, code: "user1" },
      };
      const local: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [
            {
              ...base,
              recordAdded: true,
              recordEdited: true,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        }),
      };
      const remote: NotificationConfig = {
        general: makeGeneralConfig({
          notifications: [
            {
              ...base,
              recordAdded: false,
              recordEdited: false,
              commentAdded: false,
              statusChanged: false,
              fileImported: false,
            },
          ],
        }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("recordAdded");
      expect(result.entries[0].details).toContain("recordEdited");
    });

    it("should detect general section added", () => {
      const local: NotificationConfig = {
        general: makeGeneralConfig(),
      };
      const remote: NotificationConfig = {};
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].details).toContain("added general");
    });

    it("should detect general section removed", () => {
      const local: NotificationConfig = {};
      const remote: NotificationConfig = {
        general: makeGeneralConfig(),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].details).toContain("removed general");
    });
  });

  describe("perRecord section", () => {
    it("should detect added perRecord notification", () => {
      const local: NotificationConfig = {
        perRecord: [makePerRecord()],
      };
      const remote: NotificationConfig = {
        perRecord: [],
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].section).toBe("perRecord");
    });

    it("should detect deleted perRecord notification", () => {
      const local: NotificationConfig = {
        perRecord: [],
      };
      const remote: NotificationConfig = {
        perRecord: [makePerRecord()],
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].section).toBe("perRecord");
    });

    it("should detect modified perRecord notification", () => {
      const local: NotificationConfig = {
        perRecord: [makePerRecord({ title: "New title" })],
      };
      const remote: NotificationConfig = {
        perRecord: [makePerRecord({ title: "Old title" })],
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].section).toBe("perRecord");
    });
  });

  describe("reminder section", () => {
    it("should detect added reminder notification", () => {
      const local: NotificationConfig = {
        reminder: makeReminderConfig({
          notifications: [makeReminder()],
        }),
      };
      const remote: NotificationConfig = {
        reminder: makeReminderConfig(),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].section).toBe("reminder");
    });

    it("should detect timezone change", () => {
      const local: NotificationConfig = {
        reminder: makeReminderConfig({ timezone: "America/New_York" }),
      };
      const remote: NotificationConfig = {
        reminder: makeReminderConfig({ timezone: "Asia/Tokyo" }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].section).toBe("reminder");
      expect(result.entries[0].name).toBe("timezone");
    });

    it("should detect reminder section added", () => {
      const local: NotificationConfig = {
        reminder: makeReminderConfig(),
      };
      const remote: NotificationConfig = {};
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].details).toContain("added reminder");
    });

    it("should detect reminder section removed", () => {
      const local: NotificationConfig = {};
      const remote: NotificationConfig = {
        reminder: makeReminderConfig(),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].details).toContain("removed reminder");
    });

    it("should detect modified reminder notification", () => {
      const local: NotificationConfig = {
        reminder: makeReminderConfig({
          notifications: [
            makeReminder({
              code: "reminder1",
              title: "Updated Reminder",
              daysLater: 3,
            }),
          ],
        }),
      };
      const remote: NotificationConfig = {
        reminder: makeReminderConfig({
          notifications: [
            makeReminder({
              code: "reminder1",
              title: "Reminder",
              daysLater: 1,
            }),
          ],
        }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].section).toBe("reminder");
      expect(result.entries[0].name).toBe("reminder1");
      expect(result.entries[0].details).toBe("changed");
    });

    it("should detect deleted reminder notification", () => {
      const local: NotificationConfig = {
        reminder: makeReminderConfig({
          notifications: [],
        }),
      };
      const remote: NotificationConfig = {
        reminder: makeReminderConfig({
          notifications: [
            makeReminder({ code: "reminder1", title: "Old Reminder" }),
          ],
        }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].section).toBe("reminder");
      expect(result.entries[0].name).toBe("reminder1");
      expect(result.entries[0].details).toBe("removed");
    });
  });

  describe("duplicate filterCond in perRecord", () => {
    it("should handle multiple notifications with the same filterCond", () => {
      const config: NotificationConfig = {
        perRecord: [
          makePerRecord({ filterCond: "", title: "First" }),
          makePerRecord({ filterCond: "", title: "Second" }),
        ],
      };
      const result = NotificationDiffDetector.detect(config, config);
      expect(result.isEmpty).toBe(true);
    });

    it("should detect added notification among duplicates", () => {
      const local: NotificationConfig = {
        perRecord: [
          makePerRecord({ filterCond: "", title: "First" }),
          makePerRecord({ filterCond: "", title: "Second" }),
        ],
      };
      const remote: NotificationConfig = {
        perRecord: [makePerRecord({ filterCond: "", title: "First" })],
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
    });
  });

  describe("multiple changes", () => {
    it("should detect changes across all sections", () => {
      const local: NotificationConfig = {
        general: makeGeneralConfig({ notifyToCommenter: false }),
        perRecord: [makePerRecord({ title: "new" })],
        reminder: makeReminderConfig({ timezone: "UTC" }),
      };
      const remote: NotificationConfig = {
        general: makeGeneralConfig({ notifyToCommenter: true }),
        perRecord: [makePerRecord({ title: "old" })],
        reminder: makeReminderConfig({ timezone: "Asia/Tokyo" }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.summary.total).toBeGreaterThanOrEqual(3);
      expect(result.isEmpty).toBe(false);
    });
  });

  describe("cross-section edge cases", () => {
    it("should detect all sections added when remote is empty", () => {
      const local: NotificationConfig = {
        general: makeGeneralConfig(),
        perRecord: [makePerRecord()],
        reminder: makeReminderConfig({ notifications: [makeReminder()] }),
      };
      const remote: NotificationConfig = {};
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(false);
      const sections = new Set(result.entries.map((e) => e.section));
      expect(sections.has("general")).toBe(true);
      expect(sections.has("perRecord")).toBe(true);
      expect(sections.has("reminder")).toBe(true);
    });

    it("should detect all sections removed when local is empty", () => {
      const local: NotificationConfig = {};
      const remote: NotificationConfig = {
        general: makeGeneralConfig(),
        perRecord: [makePerRecord()],
        reminder: makeReminderConfig({ notifications: [makeReminder()] }),
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(false);
      expect(
        result.entries.some(
          (e) => e.section === "general" && e.type === "deleted",
        ),
      ).toBe(true);
      expect(
        result.entries.some(
          (e) => e.section === "perRecord" && e.type === "deleted",
        ),
      ).toBe(true);
      expect(
        result.entries.some(
          (e) => e.section === "reminder" && e.type === "deleted",
        ),
      ).toBe(true);
    });

    it("should treat perRecord undefined the same as empty array", () => {
      const local: NotificationConfig = { perRecord: undefined };
      const remote: NotificationConfig = { perRecord: [] };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
    });

    it("should handle multiple duplicate filterCond groups in perRecord", () => {
      const local: NotificationConfig = {
        perRecord: [
          makePerRecord({ filterCond: "a", title: "A1" }),
          makePerRecord({ filterCond: "a", title: "A2" }),
          makePerRecord({ filterCond: "b", title: "B1" }),
        ],
      };
      const remote: NotificationConfig = {
        perRecord: [
          makePerRecord({ filterCond: "a", title: "A1" }),
          makePerRecord({ filterCond: "b", title: "B1" }),
          makePerRecord({ filterCond: "b", title: "B2" }),
        ],
      };
      const result = NotificationDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(false);
      // "a" group: local has 2, remote has 1 -> 1 added
      // "b" group: local has 1, remote has 2 -> 1 deleted
      expect(result.summary.added).toBeGreaterThanOrEqual(1);
      expect(result.summary.deleted).toBeGreaterThanOrEqual(1);
    });
  });
});
