import { describe, expect, it } from "vitest";
import { setupTestNotificationContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyNotification } from "../applyNotification";

const VALID_FULL_CONFIG = `
general:
  notifyToCommenter: true
  notifications:
    - entity:
        type: USER
        code: admin
      recordAdded: true
      recordEdited: false
      commentAdded: true
      statusChanged: false
      fileImported: false
perRecord:
  - filterCond: 'status = "open"'
    title: Open records
    targets:
      - entity:
          type: USER
          code: admin
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      filterCond: ""
      title: Due tomorrow
      targets:
        - entity:
            type: USER
            code: admin
`;

const VALID_GENERAL_ONLY = `
general:
  notifyToCommenter: false
  notifications: []
`;

const VALID_PER_RECORD_ONLY = `
perRecord:
  - filterCond: 'status = "open"'
    title: Open records
    targets:
      - entity:
          type: USER
          code: admin
`;

const VALID_REMINDER_ONLY = `
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: due_date
      daysLater: 1
      hoursLater: 9
      filterCond: ""
      title: Due tomorrow
      targets:
        - entity:
            type: USER
            code: admin
`;

describe("applyNotification", () => {
  const getContainer = setupTestNotificationContainer();

  describe("success cases", () => {
    it("should call all APIs for full config", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_FULL_CONFIG);

      await applyNotification({ container });

      expect(container.notificationConfigurator.callLog).toEqual([
        "getGeneralNotifications",
        "updateGeneralNotifications",
        "getPerRecordNotifications",
        "updatePerRecordNotifications",
        "getReminderNotifications",
        "updateReminderNotifications",
      ]);
    });

    it("should call only general API for general-only config", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_GENERAL_ONLY);

      await applyNotification({ container });

      expect(container.notificationConfigurator.callLog).toEqual([
        "getGeneralNotifications",
        "updateGeneralNotifications",
      ]);
    });

    it("should call only perRecord API for perRecord-only config", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_PER_RECORD_ONLY);

      await applyNotification({ container });

      expect(container.notificationConfigurator.callLog).toEqual([
        "getPerRecordNotifications",
        "updatePerRecordNotifications",
      ]);
    });

    it("should call only reminder API for reminder-only config", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_REMINDER_ONLY);

      await applyNotification({ container });

      expect(container.notificationConfigurator.callLog).toEqual([
        "getReminderNotifications",
        "updateReminderNotifications",
      ]);
    });

    it("should pass revision from current notifications", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_GENERAL_ONLY);
      container.notificationConfigurator.setGeneralNotifications({
        notifyToCommenter: false,
        notifications: [],
        revision: "42",
      });

      await applyNotification({ container });

      expect(
        container.notificationConfigurator.lastUpdateGeneralParams?.revision,
      ).toBe("42");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(applyNotification({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for empty config", async () => {
      const container = getContainer();
      container.notificationStorage.setContent("");

      await expect(applyNotification({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.notificationStorage.setContent("{ invalid: yaml:");

      await expect(applyNotification({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get() fails", async () => {
      const container = getContainer();
      container.notificationStorage.setFailOn("get");

      await expect(applyNotification({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when getGeneralNotifications() fails", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_GENERAL_ONLY);
      container.notificationConfigurator.setFailOn("getGeneralNotifications");

      await expect(applyNotification({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when updateGeneralNotifications() fails", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_GENERAL_ONLY);
      container.notificationConfigurator.setFailOn(
        "updateGeneralNotifications",
      );

      await expect(applyNotification({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
