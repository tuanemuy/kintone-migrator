import { describe, expect, it } from "vitest";
import { setupTestNotificationContainer } from "@/core/application/__tests__/helpers";
import { loadNotificationRemote } from "../loadNotificationRemote";

describe("loadNotificationRemote", () => {
  const getContainer = setupTestNotificationContainer();

  it("bundles the three sections with the general revision", async () => {
    const container = getContainer();
    container.notificationConfigurator.setGeneralNotifications({
      notifyToCommenter: true,
      notifications: [],
      revision: "7",
    });
    container.notificationConfigurator.setPerRecordNotifications({
      notifications: [],
      revision: "8",
    });
    container.notificationConfigurator.setReminderNotifications({
      timezone: "UTC",
      notifications: [],
      revision: "9",
    });

    const remote = await loadNotificationRemote(container);

    expect(remote).toStrictEqual({
      config: {
        general: { notifyToCommenter: true, notifications: [] },
        perRecord: [],
        reminder: { timezone: "UTC", notifications: [] },
      },
      revision: "7",
    });
  });

  it("leaves an unset reminder timezone absent", async () => {
    const container = getContainer();
    container.notificationConfigurator.setReminderNotifications({
      notifications: [],
      revision: "1",
    });

    const remote = await loadNotificationRemote(container);

    expect(remote.config.reminder).toStrictEqual({ notifications: [] });
  });
});
