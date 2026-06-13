import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import type {
  GeneralNotification,
  NotificationConfig,
  PerRecordNotification,
  ReminderNotification,
} from "../../entity";
import { NotificationErrorCode } from "../../errorCode";
import {
  computeNotificationThreeWayMerge,
  resolveNotificationMerge,
} from "../notificationMerge";

function general(
  code: string,
  overrides: Partial<GeneralNotification> = {},
): GeneralNotification {
  return {
    entity: { type: "USER", code },
    recordAdded: true,
    recordEdited: false,
    commentAdded: false,
    statusChanged: false,
    fileImported: false,
    ...overrides,
  };
}

function perRecord(
  overrides: Partial<PerRecordNotification> = {},
): PerRecordNotification {
  return {
    filterCond: "",
    title: "p",
    targets: [{ entity: { type: "USER", code: "bob" } }],
    ...overrides,
  };
}

function reminder(
  code: string,
  overrides: Partial<ReminderNotification> = {},
): ReminderNotification {
  return {
    code,
    daysLater: 1,
    filterCond: "",
    title: code,
    targets: [{ entity: { type: "USER", code: "bob" } }],
    ...overrides,
  };
}

function config(over: Partial<NotificationConfig> = {}): NotificationConfig {
  return {
    general: { notifyToCommenter: false, notifications: [] },
    perRecord: [],
    reminder: { timezone: "Asia/Tokyo", notifications: [] },
    ...over,
  };
}

function kinds(entries: ReadonlyArray<{ change: { kind: string } }>): string[] {
  return entries.map((e) => e.change.kind);
}

describe("computeNotificationThreeWayMerge", () => {
  it("reminder uses the `code` stable key: reordering does not flag changes", () => {
    const base = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a"), reminder("b"), reminder("c")],
      },
    });
    // local reordered the same reminders; remote == base.
    const local = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("c"), reminder("a"), reminder("b")],
      },
    });
    const merge = computeNotificationThreeWayMerge(base, local, base);

    // Every reminder matched by code → all unchanged, no false positives.
    expect(merge.entries.every((e) => e.change.kind === "unchanged")).toBe(
      true,
    );
    expect(merge.hasConflict).toBe(false);
  });

  it("reminder modification on one entry surfaces exactly one localOnly change", () => {
    const base = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a"), reminder("b")],
      },
    });
    const local = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a", { daysLater: 9 }), reminder("b")],
      },
    });
    const merge = computeNotificationThreeWayMerge(base, local, base);
    const changed = merge.entries.filter((e) => e.change.kind === "localOnly");
    expect(changed).toHaveLength(1);
    expect(changed[0].key).toBe("reminder:a");
  });

  it("perRecord matches multiple entries sharing a filterCond by index", () => {
    const base = config({
      perRecord: [
        perRecord({ filterCond: "x", title: "x0" }),
        perRecord({ filterCond: "x", title: "x1" }),
      ],
    });
    // local edits only the second entry of the "x" group.
    const local = config({
      perRecord: [
        perRecord({ filterCond: "x", title: "x0" }),
        perRecord({ filterCond: "x", title: "x1-edited" }),
      ],
    });
    const merge = computeNotificationThreeWayMerge(base, local, base);
    const changed = merge.entries.filter((e) => e.change.kind === "localOnly");
    expect(changed).toHaveLength(1);
    expect(changed[0].key).toBe("perRecord:x#1");
  });

  it("general scalar notifyToCommenter change is captured (not dropped)", () => {
    const base = config({
      general: { notifyToCommenter: false, notifications: [general("a")] },
    });
    const local = config({
      general: { notifyToCommenter: true, notifications: [general("a")] },
    });
    const merge = computeNotificationThreeWayMerge(base, local, base);

    expect(merge.generalScalar.change.kind).toBe("localOnly");
    // The entity list itself is unchanged.
    expect(merge.entries.every((e) => e.change.kind === "unchanged")).toBe(
      true,
    );
  });

  it("classifies a remoteOnly change (drift) on a general entity", () => {
    const base = config({
      general: { notifyToCommenter: false, notifications: [general("a")] },
    });
    const remote = config({
      general: {
        notifyToCommenter: false,
        notifications: [general("a", { commentAdded: true })],
      },
    });
    const merge = computeNotificationThreeWayMerge(base, base, remote);
    expect(kinds(merge.entries)).toContain("remoteOnly");
    expect(merge.hasConflict).toBe(false);
  });

  it("classifies a conflict when both sides change the same reminder differently", () => {
    const base = config({
      reminder: { timezone: "Asia/Tokyo", notifications: [reminder("a")] },
    });
    const local = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a", { daysLater: 2 })],
      },
    });
    const remote = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a", { daysLater: 3 })],
      },
    });
    const merge = computeNotificationThreeWayMerge(base, local, remote);

    expect(merge.hasConflict).toBe(true);
    expect(merge.conflicts).toEqual([{ key: "reminder:a" }]);
  });

  it("conflict on the reminder timezone scalar is surfaced", () => {
    const base = config({
      reminder: { timezone: "Asia/Tokyo", notifications: [] },
    });
    const local = config({
      reminder: { timezone: "UTC", notifications: [] },
    });
    const remote = config({
      reminder: { timezone: "America/New_York", notifications: [] },
    });
    const merge = computeNotificationThreeWayMerge(base, local, remote);
    expect(merge.reminderTimezone.change.kind).toBe("conflict");
    expect(merge.conflicts).toContainEqual({ key: "reminder:timezone" });
  });
});

describe("resolveNotificationMerge", () => {
  it("applies auto-merged entries and chosen conflict sides", () => {
    const base = config({
      reminder: { timezone: "Asia/Tokyo", notifications: [reminder("a")] },
    });
    const local = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a", { daysLater: 2 })],
      },
    });
    const remote = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a", { daysLater: 3 })],
      },
    });
    const merge = computeNotificationThreeWayMerge(base, local, remote);
    const merged = resolveNotificationMerge(
      merge,
      new Map([["reminder:a", "remote"]]),
    );
    expect(merged.reminder?.notifications[0]?.daysLater).toBe(3);
  });

  it("throws NtUnresolvedConflict when a conflict is left unresolved", () => {
    const base = config({
      reminder: { timezone: "Asia/Tokyo", notifications: [reminder("a")] },
    });
    const local = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a", { daysLater: 2 })],
      },
    });
    const remote = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a", { daysLater: 3 })],
      },
    });
    const merge = computeNotificationThreeWayMerge(base, local, remote);
    expect(() => resolveNotificationMerge(merge, new Map())).toThrow(
      BusinessRuleError,
    );
    try {
      resolveNotificationMerge(merge, new Map());
    } catch (e) {
      expect((e as BusinessRuleError).code).toBe(
        NotificationErrorCode.NtUnresolvedConflict,
      );
    }
  });

  it("drops deletions (local-only deletion is absent from the result)", () => {
    const base = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder("a"), reminder("b")],
      },
    });
    // local removed reminder "b".
    const local = config({
      reminder: { timezone: "Asia/Tokyo", notifications: [reminder("a")] },
    });
    const merge = computeNotificationThreeWayMerge(base, local, base);
    const merged = resolveNotificationMerge(merge, new Map());
    expect(merged.reminder?.notifications.map((n) => n.code)).toEqual(["a"]);
  });
});
