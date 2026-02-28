import { describe, expect, it } from "vitest";
import { setupTestNotificationContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectNotificationDiff } from "../detectNotificationDiff";

const VALID_CONFIG = `
general:
  notifyToCommenter: true
  notifications:
    - entity:
        type: USER
        code: admin
      recordAdded: true
      recordEdited: false
      commentAdded: false
      statusChanged: false
      fileImported: false
perRecord: []
reminder:
  timezone: Asia/Tokyo
  notifications: []
`;

describe("detectNotificationDiff", () => {
  const getContainer = setupTestNotificationContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_CONFIG);
      container.notificationConfigurator.setGeneralNotifications({
        notifyToCommenter: true,
        notifications: [
          {
            entity: { type: "USER", code: "admin" },
            recordAdded: true,
            recordEdited: false,
            commentAdded: false,
            statusChanged: false,
            fileImported: false,
          },
        ],
        revision: "1",
      });

      const result = await detectNotificationDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_CONFIG);
      container.notificationConfigurator.setGeneralNotifications({
        notifyToCommenter: false,
        notifications: [],
        revision: "1",
      });

      const result = await detectNotificationDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectNotificationDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.notificationStorage.setFailOn("get");

      await expect(detectNotificationDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.notificationStorage.setContent(VALID_CONFIG);
      container.notificationConfigurator.setFailOn("getGeneralNotifications");

      await expect(detectNotificationDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
