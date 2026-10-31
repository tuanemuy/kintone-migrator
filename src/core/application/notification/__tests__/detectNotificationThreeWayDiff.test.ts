import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestNotificationContainer } from "@/core/application/__tests__/helpers";
import type { TestNotificationContainer } from "@/core/application/__tests__/helpers/notification";
import type {
  GeneralNotification,
  NotificationConfig,
  PerRecordNotification,
  ReminderNotification,
} from "@/core/domain/notification/entity";
import { NotificationConfigSerializer } from "@/core/domain/notification/services/configSerializer";
import { NotificationStateSerializer } from "@/core/domain/notification/services/notificationStateSerializer";
import { detectNotificationThreeWayDiff } from "../detectNotificationThreeWayDiff";

function general(
  overrides: Partial<GeneralNotification> = {},
): GeneralNotification {
  return {
    entity: { type: "USER", code: "alice" },
    recordAdded: true,
    recordEdited: false,
    commentAdded: false,
    statusChanged: false,
    fileImported: false,
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

function perRecord(
  overrides: Partial<PerRecordNotification> = {},
): PerRecordNotification {
  return {
    filterCond: 'status = "A"',
    title: "承認",
    targets: [{ entity: { type: "USER", code: "bob" } }],
    ...overrides,
  };
}

function config(over: Partial<NotificationConfig> = {}): NotificationConfig {
  return {
    general: { notifyToCommenter: false, notifications: [general()] },
    perRecord: [],
    reminder: { timezone: "Asia/Tokyo", notifications: [reminder("r1")] },
    ...over,
  };
}

function setBase(
  container: TestNotificationContainer,
  base: NotificationConfig,
): void {
  container.notificationStateStorage.setContent(
    configCodec.stringify(
      NotificationStateSerializer.serialize({ config: base }),
    ),
  );
  container.appRevisionStorage.setContent(
    configCodec.stringify({ revision: "1" }),
  );
}

function setLocal(
  container: TestNotificationContainer,
  local: NotificationConfig,
): void {
  container.notificationStorage.setContent(
    configCodec.stringify(NotificationConfigSerializer.serialize(local)),
  );
}

function setRemote(
  container: TestNotificationContainer,
  remote: NotificationConfig,
): void {
  container.notificationConfigurator.setGeneralNotifications({
    notifyToCommenter: remote.general?.notifyToCommenter ?? false,
    notifications: remote.general?.notifications ?? [],
    revision: "1",
  });
  container.notificationConfigurator.setPerRecordNotifications({
    notifications: remote.perRecord ?? [],
    revision: "1",
  });
  container.notificationConfigurator.setReminderNotifications({
    ...(remote.reminder?.timezone !== undefined
      ? { timezone: remote.reminder.timezone }
      : {}),
    notifications: remote.reminder?.notifications ?? [],
    revision: "1",
  });
}

describe("detectNotificationThreeWayDiff", () => {
  const getContainer = setupTestNotificationContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    setLocal(container, config());
    setRemote(container, config());

    const result = await detectNotificationThreeWayDiff({ container });
    expect(result.mode).toBe("two-way");
  });

  it("reports an empty 3-way diff when everything is in sync", async () => {
    const container = getContainer();
    const base = config();
    setBase(container, base);
    setLocal(container, base);
    setRemote(container, base);

    const result = await detectNotificationThreeWayDiff({ container });
    if (result.mode !== "three-way") throw new Error("expected three-way");
    expect(result.isEmpty).toBe(true);
  });

  it("classifies a local-only reminder change", async () => {
    const container = getContainer();
    const base = config();
    setBase(container, base);
    setLocal(
      container,
      config({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [reminder("r1", { daysLater: 9 })],
        },
      }),
    );
    setRemote(container, base);

    const result = await detectNotificationThreeWayDiff({ container });
    if (result.mode !== "three-way") throw new Error("expected three-way");
    expect(result.localChanges.map((e) => e.key)).toContain("reminder:r1");
    expect(result.remoteDrift).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  describe("perRecord keys", () => {
    it("shows the key with its filterCond quoted, the label unchanged", async () => {
      const container = getContainer();
      const filterCond = 'a ]: "b"#1\nc';
      const base = config({
        perRecord: [perRecord({ filterCond }), perRecord({ filterCond })],
      });
      setBase(container, base);
      setLocal(
        container,
        config({
          perRecord: [
            perRecord({ filterCond }),
            perRecord({ filterCond, targets: [] }),
          ],
        }),
      );
      setRemote(container, base);

      const result = await detectNotificationThreeWayDiff({ container });
      if (result.mode !== "three-way") throw new Error("expected three-way");
      expect(result.localChanges).toEqual([
        {
          key: 'perRecord:"a ]: \\"b\\"#1\\nc"#1',
          label: "承認",
          kind: "localOnly",
        },
      ]);
    });

    it("shows an empty filterCond in the key as an empty quoted string", async () => {
      const container = getContainer();
      const base = config({ perRecord: [perRecord({ filterCond: "" })] });
      setBase(container, base);
      setLocal(container, base);
      setRemote(
        container,
        config({ perRecord: [perRecord({ filterCond: "", targets: [] })] }),
      );

      const result = await detectNotificationThreeWayDiff({ container });
      if (result.mode !== "three-way") throw new Error("expected three-way");
      expect(result.remoteDrift).toEqual([
        { key: 'perRecord:""#0', label: "承認", kind: "remoteOnly" },
      ]);
    });

    it("shows a general entity key as it is", async () => {
      const container = getContainer();
      const base = config();
      setBase(container, base);
      setLocal(
        container,
        config({
          general: {
            notifyToCommenter: false,
            notifications: [general({ recordEdited: true })],
          },
        }),
      );
      setRemote(container, base);

      const result = await detectNotificationThreeWayDiff({ container });
      if (result.mode !== "three-way") throw new Error("expected three-way");
      expect(result.localChanges.map((e) => e.key)).toEqual([
        "general:USER:alice",
      ]);
    });
  });

  describe("perRecord labels", () => {
    async function labelsOfLocalChanges(
      container: TestNotificationContainer,
      before: PerRecordNotification,
      after: PerRecordNotification,
    ): Promise<string[]> {
      const base = config({ perRecord: [before] });
      setBase(container, base);
      setLocal(container, config({ perRecord: [after] }));
      setRemote(container, base);
      const result = await detectNotificationThreeWayDiff({ container });
      if (result.mode !== "three-way") throw new Error("expected three-way");
      return result.localChanges.map((e) => e.label);
    }

    it("labels a notification by its title without quoting", async () => {
      const labels = await labelsOfLocalChanges(
        getContainer(),
        perRecord(),
        perRecord({ targets: [] }),
      );
      expect(labels).toEqual(["承認"]);
    });

    it("labels a notification without a title by its quoted filterCond", async () => {
      const labels = await labelsOfLocalChanges(
        getContainer(),
        perRecord({ title: "" }),
        perRecord({ title: "", targets: [] }),
      );
      expect(labels).toEqual(['"status = \\"A\\""']);
    });

    it("labels a notification with neither title nor filterCond (empty filter)", async () => {
      const labels = await labelsOfLocalChanges(
        getContainer(),
        perRecord({ title: "", filterCond: "" }),
        perRecord({ title: "", filterCond: "", targets: [] }),
      );
      expect(labels).toEqual(["(empty filter)"]);
    });
  });

  it("classifies the general scalar notifyToCommenter as remote drift", async () => {
    const container = getContainer();
    const base = config();
    setBase(container, base);
    setLocal(container, base);
    setRemote(
      container,
      config({
        general: { notifyToCommenter: true, notifications: [general()] },
      }),
    );

    const result = await detectNotificationThreeWayDiff({ container });
    if (result.mode !== "three-way") throw new Error("expected three-way");
    expect(result.remoteDrift.map((e) => e.key)).toContain(
      "general:notifyToCommenter",
    );
  });

  it("classifies a conflict on the same reminder", async () => {
    const container = getContainer();
    const base = config();
    setBase(container, base);
    setLocal(
      container,
      config({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [reminder("r1", { daysLater: 2 })],
        },
      }),
    );
    setRemote(
      container,
      config({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [reminder("r1", { daysLater: 3 })],
        },
      }),
    );

    const result = await detectNotificationThreeWayDiff({ container });
    if (result.mode !== "three-way") throw new Error("expected three-way");
    expect(result.conflicts.map((e) => e.key)).toContain("reminder:r1");
    expect(result.isEmpty).toBe(false);
  });

  describe("reminder timezone", () => {
    const unsetReminder = { notifications: [] };

    it.each([
      ["null", "null"],
      ["空文字", '""'],
    ])("reports no changes when local and state hold timezone %s and the remote is unset", async (_, yamlValue) => {
      const container = getContainer();
      const text = [
        "general:",
        "  notifyToCommenter: false",
        "  notifications: []",
        "perRecord: []",
        "reminder:",
        `  timezone: ${yamlValue}`,
        "  notifications: []",
        "",
      ].join("\n");
      container.notificationStateStorage.setContent(text);
      container.appRevisionStorage.setContent(
        configCodec.stringify({ revision: "1" }),
      );
      container.notificationStorage.setContent(text);
      setRemote(
        container,
        config({
          general: { notifyToCommenter: false, notifications: [] },
          reminder: unsetReminder,
        }),
      );

      const result = await detectNotificationThreeWayDiff({ container });
      if (result.mode !== "three-way") throw new Error("expected three-way");
      expect(result.isEmpty).toBe(true);
    });

    it("does not report remote drift when the local timezone is unset", async () => {
      const container = getContainer();
      const base = config({ reminder: unsetReminder });
      setBase(container, base);
      setLocal(container, base);
      setRemote(
        container,
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
      );

      const result = await detectNotificationThreeWayDiff({ container });
      if (result.mode !== "three-way") throw new Error("expected three-way");
      expect(result.isEmpty).toBe(true);
    });

    it("classifies a timezone set locally against an unset base and remote as a local change", async () => {
      const container = getContainer();
      const base = config({ reminder: unsetReminder });
      setBase(container, base);
      setLocal(
        container,
        config({ reminder: { timezone: "UTC", notifications: [] } }),
      );
      setRemote(container, base);

      const result = await detectNotificationThreeWayDiff({ container });
      if (result.mode !== "three-way") throw new Error("expected three-way");
      expect(result.localChanges).toEqual([
        { key: "reminder:timezone", label: "timezone", kind: "localOnly" },
      ]);
      expect(result.remoteDrift).toEqual([]);
    });

    it("classifies a remote timezone change as drift when the local timezone is set", async () => {
      const container = getContainer();
      const base = config({ reminder: { timezone: "UTC", notifications: [] } });
      setBase(container, base);
      setLocal(container, base);
      setRemote(
        container,
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
      );

      const result = await detectNotificationThreeWayDiff({ container });
      if (result.mode !== "three-way") throw new Error("expected three-way");
      expect(result.remoteDrift).toEqual([
        { key: "reminder:timezone", label: "timezone", kind: "remoteOnly" },
      ]);
    });
  });
});
