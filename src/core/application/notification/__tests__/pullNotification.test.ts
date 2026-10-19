import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestNotificationContainer } from "@/core/application/__tests__/helpers";
import type { TestNotificationContainer } from "@/core/application/__tests__/helpers/notification";
import { isValidationError } from "@/core/application/error";
import type {
  GeneralNotification,
  NotificationConfig,
  ReminderNotification,
} from "@/core/domain/notification/entity";
import { NotificationConfigSerializer } from "@/core/domain/notification/services/configSerializer";
import { NotificationStateSerializer } from "@/core/domain/notification/services/notificationStateSerializer";
import { detectNotificationThreeWayDiff } from "../detectNotificationThreeWayDiff";
import {
  applyPulledNotificationMerge,
  pullNotification,
} from "../pullNotification";

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

function setRemote(
  container: TestNotificationContainer,
  remote: NotificationConfig,
  revision: string,
): void {
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
    ...(remote.reminder?.timezone !== undefined
      ? { timezone: remote.reminder.timezone }
      : {}),
    notifications: remote.reminder?.notifications ?? [],
    revision,
  });
}

function setBase(
  container: TestNotificationContainer,
  base: NotificationConfig,
  revision: string,
): void {
  container.notificationStateStorage.setContent(
    configCodec.stringify(
      NotificationStateSerializer.serialize({ config: base }),
    ),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

function setLocal(
  container: TestNotificationContainer,
  local: NotificationConfig,
): void {
  container.notificationStorage.setContent(
    configCodec.stringify(NotificationConfigSerializer.serialize(local)),
  );
}

describe("pullNotification", () => {
  const getContainer = setupTestNotificationContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    setRemote(
      container,
      config({
        general: { notifyToCommenter: true, notifications: [general()] },
      }),
      "3",
    );

    const result = await pullNotification({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.notificationStorage.callLog).toContain("update");
    expect(container.notificationStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote bypassing merge", async () => {
    const container = getContainer();
    setBase(container, config(), "1");
    setLocal(container, config());
    setRemote(
      container,
      config({
        general: { notifyToCommenter: true, notifications: [general()] },
      }),
      "2",
    );

    const result = await pullNotification({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("force");
    expect(container.notificationStorage.callLog).toContain("update");
  });

  it("returns a merged result without conflicts (one-sided remote drift)", async () => {
    const container = getContainer();
    const base = config();
    setBase(container, base, "1");
    setLocal(container, base);
    setRemote(
      container,
      config({
        reminder: {
          timezone: "Asia/Tokyo",
          notifications: [reminder("r1", { daysLater: 5 })],
        },
      }),
      "2",
    );

    const result = await pullNotification({ container, input: {} });
    if (result.mode !== "merged") throw new Error("expected merged");
    expect(result.merge.hasConflict).toBe(false);

    // applying with an empty resolution succeeds and writes local + state.
    await applyPulledNotificationMerge({
      container,
      input: {
        merge: result.merge,
        resolution: new Map(),
        remoteConfig: result.remoteConfig,
        remoteRevision: result.remoteRevision,
      },
    });
    expect(container.notificationStorage.callLog).toContain("update");
  });

  it("surfaces a conflict and applies the chosen side", async () => {
    const container = getContainer();
    const base = config();
    setBase(container, base, "1");
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
      "2",
    );

    const result = await pullNotification({ container, input: {} });
    if (result.mode !== "merged") throw new Error("expected merged");
    expect(result.merge.hasConflict).toBe(true);
    expect(result.merge.conflicts).toContainEqual({ key: "reminder:r1" });

    await applyPulledNotificationMerge({
      container,
      input: {
        merge: result.merge,
        resolution: new Map([["reminder:r1", "local"]]),
        remoteConfig: result.remoteConfig,
        remoteRevision: result.remoteRevision,
      },
    });
    expect(container.notificationStorage.callLog).toContain("update");
  });

  it("does not write local/state when the first stage returns merged (resolution aborted)", async () => {
    const container = getContainer();
    const base = config();
    setBase(container, base, "1");
    setLocal(
      container,
      config({
        general: { notifyToCommenter: true, notifications: [general()] },
      }),
    );
    setRemote(container, base, "1");

    const result = await pullNotification({ container, input: {} });
    expect(result.mode).toBe("merged");
    // pull's first stage never touches local/state for the merged path.
    expect(container.notificationStorage.callLog).not.toContain("update");
    expect(container.notificationStateStorage.callLog).not.toContain("update");
  });

  it("throws ValidationError from applyMerge when a conflict is unresolved", async () => {
    const container = getContainer();
    const base = config();
    setBase(container, base, "1");
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
      "2",
    );

    const result = await pullNotification({ container, input: {} });
    if (result.mode !== "merged") throw new Error("expected merged");

    await expect(
      applyPulledNotificationMerge({
        container,
        input: {
          merge: result.merge,
          resolution: new Map(),
          remoteConfig: result.remoteConfig,
          remoteRevision: result.remoteRevision,
        },
      }),
    ).rejects.toSatisfy(isValidationError);
  });

  describe("reminder timezone", () => {
    async function readLocal(container: TestNotificationContainer) {
      const saved = await container.notificationStorage.get();
      if (!saved.exists) throw new Error("expected local config");
      return configCodec.parse(saved.content) as Record<string, unknown>;
    }

    async function pullAndApply(container: TestNotificationContainer) {
      const result = await pullNotification({ container, input: {} });
      if (result.mode !== "merged") throw new Error("expected merged");
      await applyPulledNotificationMerge({
        container,
        input: {
          merge: result.merge,
          resolution: new Map(),
          remoteConfig: result.remoteConfig,
          remoteRevision: result.remoteRevision,
        },
      });
    }

    it("first run does not write a timezone for an app whose timezone is unset", async () => {
      const container = getContainer();
      setRemote(container, config({ reminder: { notifications: [] } }), "3");

      await pullNotification({ container, input: {} });

      expect((await readLocal(container)).reminder).toStrictEqual({
        notifications: [],
      });
    });

    it("force does not write a timezone for an app whose timezone is unset", async () => {
      const container = getContainer();
      setBase(container, config(), "1");
      setLocal(container, config());
      setRemote(container, config({ reminder: { notifications: [] } }), "2");

      await pullNotification({ container, input: { force: true } });

      expect((await readLocal(container)).reminder).toStrictEqual({
        notifications: [],
      });
    });

    it("keeps an unset local timezone unset even when the remote has one", async () => {
      const container = getContainer();
      const base = config({ reminder: { notifications: [] } });
      setBase(container, base, "1");
      setLocal(container, base);
      setRemote(
        container,
        config({ reminder: { timezone: "Asia/Tokyo", notifications: [] } }),
        "2",
      );

      await pullAndApply(container);

      expect((await readLocal(container)).reminder).toStrictEqual({
        notifications: [],
      });
    });

    it("takes a remote timezone change when the local timezone is set", async () => {
      const container = getContainer();
      const base = config({
        reminder: { timezone: "Asia/Tokyo", notifications: [] },
      });
      setBase(container, base, "1");
      setLocal(container, base);
      setRemote(
        container,
        config({ reminder: { timezone: "UTC", notifications: [] } }),
        "2",
      );

      await pullAndApply(container);

      expect((await readLocal(container)).reminder).toStrictEqual({
        timezone: "UTC",
        notifications: [],
      });
    });

    it("converges to no diff after pulling an unset timezone recorded as null", async () => {
      const container = getContainer();
      const legacy = [
        "general:",
        "  notifyToCommenter: false",
        "  notifications: []",
        "perRecord: []",
        "reminder:",
        "  timezone: null",
        "  notifications: []",
        "",
      ].join("\n");
      container.notificationStateStorage.setContent(legacy);
      container.appRevisionStorage.setContent(
        configCodec.stringify({ revision: "1" }),
      );
      container.notificationStorage.setContent(legacy);
      setRemote(
        container,
        config({
          general: { notifyToCommenter: false, notifications: [] },
          reminder: { notifications: [] },
        }),
        "1",
      );

      await pullAndApply(container);
      const diff = await detectNotificationThreeWayDiff({ container });

      if (diff.mode !== "three-way") throw new Error("expected three-way");
      expect(diff.isEmpty).toBe(true);
      expect((await readLocal(container)).reminder).toStrictEqual({
        notifications: [],
      });
    });
  });
});
