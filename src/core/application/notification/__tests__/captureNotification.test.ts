import { describe, expect, it } from "vitest";
import { setupTestNotificationContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureNotification } from "../captureNotification";

describe("captureNotification", () => {
  const getContainer = setupTestNotificationContainer();

  describe("success cases", () => {
    it("should capture all notification types and serialize to YAML", async () => {
      const container = getContainer();
      container.notificationConfigurator.setGeneralNotifications({
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
        revision: "1",
      });
      container.notificationConfigurator.setPerRecordNotifications({
        notifications: [
          {
            filterCond: 'status = "open"',
            title: "Open records",
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
        revision: "1",
      });
      container.notificationConfigurator.setReminderNotifications({
        timezone: "Asia/Tokyo",
        notifications: [
          {
            code: "due_date",
            daysLater: 1,
            hoursLater: 9,
            filterCond: "",
            title: "Due tomorrow",
            targets: [{ entity: { type: "USER", code: "admin" } }],
          },
        ],
        revision: "1",
      });

      const result = await captureNotification({ container });

      expect(result.configText).toContain("general:");
      expect(result.configText).toContain("perRecord:");
      expect(result.configText).toContain("reminder:");
      expect(result.configText).toContain("admin");
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.notificationStorage.setContent("existing content");

      const result = await captureNotification({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();

      const result = await captureNotification({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getGeneralNotifications() fails", async () => {
      const container = getContainer();
      container.notificationConfigurator.setFailOn("getGeneralNotifications");

      await expect(captureNotification({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when getPerRecordNotifications() fails", async () => {
      const container = getContainer();
      container.notificationConfigurator.setFailOn("getPerRecordNotifications");

      await expect(captureNotification({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when getReminderNotifications() fails", async () => {
      const container = getContainer();
      container.notificationConfigurator.setFailOn("getReminderNotifications");

      await expect(captureNotification({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when storage.get() fails", async () => {
      const container = getContainer();
      container.notificationStorage.setFailOn("get");

      await expect(captureNotification({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
