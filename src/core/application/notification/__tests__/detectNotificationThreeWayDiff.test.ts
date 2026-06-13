import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestNotificationContainer } from "@/core/application/__tests__/helpers";
import type { TestNotificationContainer } from "@/core/application/__tests__/helpers/notification";
import type {
  GeneralNotification,
  NotificationConfig,
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
    timezone: remote.reminder?.timezone ?? "Asia/Tokyo",
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
});
