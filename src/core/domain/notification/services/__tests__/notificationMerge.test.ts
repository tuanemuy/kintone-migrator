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
    expect(merge.reminderTimezone?.change.kind).toBe("conflict");
    expect(merge.conflicts).toContainEqual({ key: "reminder:timezone" });
  });

  describe("reminder timezone", () => {
    const unset = { notifications: [] };
    const tz = (timezone: string) => ({ timezone, notifications: [] });

    it.each([
      ["unset on all sides", unset, unset, unset],
      ["remote set, base unset", unset, unset, tz("Asia/Tokyo")],
      ["remote changed from base", tz("Asia/Tokyo"), unset, tz("UTC")],
    ])("is not classified when the local timezone is unset (%s)", (_, base, local, remote) => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: base }),
        config({ reminder: local }),
        config({ reminder: remote }),
      );
      expect(merge.reminderTimezone).toBeUndefined();
      expect(merge.conflicts).toEqual([]);
      expect(merge.hasConflict).toBe(false);
    });

    it("is not classified when the local reminder section is omitted", () => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: tz("Asia/Tokyo") }),
        config({ reminder: undefined }),
        config({ reminder: tz("UTC") }),
      );
      expect(merge.reminderTimezone).toBeUndefined();
      expect(merge.conflicts).toEqual([]);
    });

    it.each([
      ["localOnly", unset, tz("Asia/Tokyo"), unset, "Asia/Tokyo"],
      ["remoteOnly", tz("Asia/Tokyo"), tz("Asia/Tokyo"), tz("UTC"), "UTC"],
      ["bothSame", unset, tz("UTC"), tz("UTC"), "UTC"],
      ["unchanged", tz("UTC"), tz("UTC"), tz("UTC"), "UTC"],
    ] as const)("classifies a set local timezone as %s with unset as no value", (kind, base, local, remote, merged) => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: base }),
        config({ reminder: local }),
        config({ reminder: remote }),
      );
      expect(merge.reminderTimezone?.change.kind).toBe(kind);
      expect(merge.reminderTimezone?.merged).toBe(merged);
      expect(merge.hasConflict).toBe(false);
    });

    it("classifies a conflict between a set local timezone and a remote that was unset in base", () => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: unset }),
        config({ reminder: tz("UTC") }),
        config({ reminder: tz("Asia/Tokyo") }),
      );
      expect(merge.reminderTimezone?.change.kind).toBe("conflict");
      expect(merge.conflicts).toEqual([{ key: "reminder:timezone" }]);
    });
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

  describe("reminder timezone", () => {
    it("keeps the timezone unset when the local timezone is unset", () => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: { notifications: [] } }),
        config({ reminder: { notifications: [] } }),
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
      );
      expect(resolveNotificationMerge(merge, new Map()).reminder).toStrictEqual(
        { notifications: [] },
      );
    });

    it("takes the remote timezone on remoteOnly", () => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
        config({ reminder: { timezone: "UTC", notifications: [] } }),
      );
      expect(resolveNotificationMerge(merge, new Map()).reminder).toStrictEqual(
        { timezone: "UTC", notifications: [] },
      );
    });

    it("keeps the local timezone on localOnly against an unset remote", () => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: { notifications: [] } }),
        config({ reminder: { timezone: "UTC", notifications: [] } }),
        config({ reminder: { notifications: [] } }),
      );
      expect(resolveNotificationMerge(merge, new Map()).reminder).toStrictEqual(
        { timezone: "UTC", notifications: [] },
      );
    });

    it("leaves the timezone unset on remoteOnly to an unset remote", () => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: { timezone: "UTC", notifications: [] } }),
        config({ reminder: { timezone: "UTC", notifications: [] } }),
        config({ reminder: { notifications: [] } }),
      );
      expect(merge.reminderTimezone?.change.kind).toBe("remoteOnly");
      expect(resolveNotificationMerge(merge, new Map()).reminder).toStrictEqual(
        { notifications: [] },
      );
    });

    it("leaves the timezone unset when a conflict takes an unset remote", () => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: { timezone: "UTC", notifications: [] } }),
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
        config({ reminder: { notifications: [] } }),
      );
      const merged = resolveNotificationMerge(
        merge,
        new Map([["reminder:timezone", "remote"]]),
      );
      expect(merged.reminder).toStrictEqual({ notifications: [] });
    });

    it.each([
      ["local", "UTC"],
      ["remote", "America/New_York"],
    ] as const)("takes the %s side of a timezone conflict", (side, expected) => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
        config({ reminder: { timezone: "UTC", notifications: [] } }),
        config({
          reminder: { timezone: "America/New_York", notifications: [] },
        }),
      );
      const merged = resolveNotificationMerge(
        merge,
        new Map([["reminder:timezone", side]]),
      );
      expect(merged.reminder?.timezone).toBe(expected);
    });

    it("throws NtUnresolvedConflict when a timezone conflict is left unresolved", () => {
      const merge = computeNotificationThreeWayMerge(
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
        config({ reminder: { timezone: "UTC", notifications: [] } }),
        config({
          reminder: { timezone: "America/New_York", notifications: [] },
        }),
      );
      expect(() => resolveNotificationMerge(merge, new Map())).toThrow(
        expect.objectContaining({
          code: NotificationErrorCode.NtUnresolvedConflict,
        }),
      );
    });
  });
});
