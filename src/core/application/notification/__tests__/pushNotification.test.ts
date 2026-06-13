import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestNotificationContainer } from "@/core/application/__tests__/helpers";
import type { TestNotificationContainer } from "@/core/application/__tests__/helpers/notification";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type {
  GeneralNotification,
  NotificationConfig,
  PerRecordNotification,
  ReminderNotification,
} from "@/core/domain/notification/entity";
import { NotificationConfigSerializer } from "@/core/domain/notification/services/configSerializer";
import { NotificationStateSerializer } from "@/core/domain/notification/services/notificationStateSerializer";
import { pushNotification } from "../pushNotification";

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
  overrides: Partial<ReminderNotification> = {},
): ReminderNotification {
  return {
    code: "r1",
    daysLater: 1,
    filterCond: "",
    title: "remind",
    targets: [{ entity: { type: "USER", code: "bob" } }],
    ...overrides,
  };
}

function config(over: Partial<NotificationConfig> = {}): NotificationConfig {
  return {
    general: { notifyToCommenter: false, notifications: [general()] },
    perRecord: [perRecord()],
    reminder: { timezone: "Asia/Tokyo", notifications: [reminder()] },
    ...over,
  };
}

/** Wires base state (snapshot + revision) and the remote configurator. */
function setBaseAndRemote(
  container: TestNotificationContainer,
  base: NotificationConfig,
  remote: NotificationConfig,
  revision: string,
): void {
  container.notificationStateStorage.setContent(
    configCodec.stringify(
      NotificationStateSerializer.serialize({ config: base }),
    ),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
  container.notificationConfigurator.setGeneralNotifications({
    notifyToCommenter: remote.general?.notifyToCommenter ?? false,
    notifications: remote.general?.notifications ?? [],
    revision,
  });
  container.notificationConfigurator.setPerRecordNotifications({
    notifications: remote.perRecord ?? [],
    revision,
  });
  container.notificationConfigurator.setReminderNotifications({
    timezone: remote.reminder?.timezone ?? "Asia/Tokyo",
    notifications: remote.reminder?.notifications ?? [],
    revision,
  });
}

function setLocal(
  container: TestNotificationContainer,
  local: NotificationConfig,
): void {
  container.notificationStorage.setContent(
    configCodec.stringify(NotificationConfigSerializer.serialize(local)),
  );
}

describe("pushNotification", () => {
  const getContainer = setupTestNotificationContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    setBaseAndRemote(container, config(), config(), "1");

    await expect(pushNotification({ container, input: {} })).rejects.toSatisfy(
      isValidationError,
    );
  });

  it("applies all three sections, threading the revision across updates", async () => {
    const container = getContainer();
    const base = config();
    setBaseAndRemote(container, base, base, "1");
    // local changes one entry per section so there is something to push.
    setLocal(
      container,
      config({
        general: {
          notifyToCommenter: true,
          notifications: [general({ recordEdited: true })],
        },
      }),
    );

    const result = await pushNotification({ container, input: {} });

    expect(result.mode).toBe("push");
    // First update gets the observed revision (1); each subsequent update gets
    // the previous response's revision threaded through (the fake returns
    // prev+1 = "2" from general, which is then sent to perRecord and reminder).
    expect(
      container.notificationConfigurator.lastUpdateGeneralParams?.revision,
    ).toBe("1");
    expect(
      container.notificationConfigurator.lastUpdatePerRecordParams?.revision,
    ).toBe("2");
    expect(
      container.notificationConfigurator.lastUpdateReminderParams?.revision,
    ).toBe("2");
    expect(container.notificationStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("rejects with ConfigDrift when the remote drifted (general scalar)", async () => {
    const container = getContainer();
    const base = config();
    // remote flipped notifyToCommenter (general scalar drift).
    const remote = config({
      general: { notifyToCommenter: true, notifications: [general()] },
    });
    setBaseAndRemote(container, base, remote, "2");
    setLocal(
      container,
      config({
        general: { notifyToCommenter: false, notifications: [general()] },
        // local also edits reminder so we know drift is from the scalar.
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [reminder({ title: "local" })],
        },
      }),
    );

    await expect(pushNotification({ container, input: {} })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.notificationConfigurator.callLog).not.toContain(
      "updateGeneralNotifications",
    );
  });

  it("rejects with ConfigDrift when a reminder entry drifted on the remote", async () => {
    const container = getContainer();
    const base = config();
    const remote = config({
      reminder: {
        timezone: "Asia/Tokyo",
        notifications: [reminder({ title: "remote-changed" })],
      },
    });
    setBaseAndRemote(container, base, remote, "2");
    setLocal(container, base);

    await expect(pushNotification({ container, input: {} })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    const base = config();
    const remote = config({
      general: { notifyToCommenter: true, notifications: [general()] },
    });
    setBaseAndRemote(container, base, remote, "2");
    setLocal(container, base);

    const result = await pushNotification({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("push");
    expect(
      container.notificationConfigurator.lastUpdateGeneralParams?.revision,
    ).toBeUndefined();
    expect(
      container.notificationConfigurator.lastUpdateReminderParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    setLocal(container, config());
    container.notificationConfigurator.setGeneralNotifications({
      notifyToCommenter: false,
      notifications: [],
      revision: "5",
    });
    container.notificationConfigurator.setPerRecordNotifications({
      notifications: [],
      revision: "5",
    });
    container.notificationConfigurator.setReminderNotifications({
      timezone: "Asia/Tokyo",
      notifications: [],
      revision: "5",
    });

    const result = await pushNotification({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.notificationConfigurator.lastUpdateGeneralParams?.revision,
    ).toBeUndefined();
    expect(container.notificationStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("does NOT update base/state when a later update fails (partial-application residue)", async () => {
    const container = getContainer();
    const base = config();
    setBaseAndRemote(container, base, base, "1");
    setLocal(
      container,
      config({
        general: {
          notifyToCommenter: true,
          notifications: [general({ recordEdited: true })],
        },
      }),
    );
    // Fail on the second update (perRecord) after general already applied.
    container.notificationConfigurator.setFailOn(
      "updatePerRecordNotifications",
    );

    await expect(pushNotification({ container, input: {} })).rejects.toThrow();

    // The first update was applied on the remote (cannot be rolled back) ...
    expect(container.notificationConfigurator.callLog).toContain(
      "updateGeneralNotifications",
    );
    // ... but base/state must NOT be advanced, so a re-run stays idempotent.
    expect(container.notificationStateStorage.callLog).not.toContain("update");
    expect(container.appRevisionStorage.callLog).not.toContain("update");
  });

  it("only pushes sections present in the local config", async () => {
    const container = getContainer();
    const base = config();
    setBaseAndRemote(container, base, base, "1");
    // local omits perRecord and reminder.
    setLocal(container, {
      general: {
        notifyToCommenter: true,
        notifications: [general({ recordEdited: true })],
      },
    });

    await pushNotification({ container, input: {} });

    expect(container.notificationConfigurator.callLog).toContain(
      "updateGeneralNotifications",
    );
    expect(container.notificationConfigurator.callLog).not.toContain(
      "updatePerRecordNotifications",
    );
    expect(container.notificationConfigurator.callLog).not.toContain(
      "updateReminderNotifications",
    );
  });
});
