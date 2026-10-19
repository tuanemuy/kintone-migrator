import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { describe, expect, it, vi } from "vitest";
import { KintoneNotificationConfigurator } from "../notificationConfigurator";

function createMockClient(app: Record<string, unknown>) {
  return { app } as unknown as KintoneRestAPIClient;
}

describe("KintoneNotificationConfigurator", () => {
  describe("getReminderNotifications", () => {
    it.each([
      ["null", null],
      ["空文字", ""],
    ])("timezone が %s なら未設定（timezone キーなし）として返す", async (_, timezone) => {
      const client = createMockClient({
        getReminderNotifications: vi.fn(() =>
          Promise.resolve({ timezone, notifications: [], revision: "3" }),
        ),
      });
      const configurator = new KintoneNotificationConfigurator(client, "1");

      const result = await configurator.getReminderNotifications();

      expect(result).toStrictEqual({ notifications: [], revision: "3" });
    });

    it("timezone が文字列ならそのまま返す", async () => {
      const client = createMockClient({
        getReminderNotifications: vi.fn(() =>
          Promise.resolve({
            timezone: "Asia/Tokyo",
            notifications: [],
            revision: "3",
          }),
        ),
      });
      const configurator = new KintoneNotificationConfigurator(client, "1");

      const result = await configurator.getReminderNotifications();

      expect(result).toStrictEqual({
        timezone: "Asia/Tokyo",
        notifications: [],
        revision: "3",
      });
    });
  });

  describe("updateReminderNotifications", () => {
    it("timezone が未設定なら timezone パラメータを送らない", async () => {
      const updateReminderNotifications = vi.fn((_params: unknown) =>
        Promise.resolve({ revision: "4" }),
      );
      const client = createMockClient({ updateReminderNotifications });
      const configurator = new KintoneNotificationConfigurator(client, "1");

      await configurator.updateReminderNotifications({
        notifications: [],
        revision: "3",
      });

      expect(updateReminderNotifications.mock.calls[0]?.[0]).toStrictEqual({
        app: "1",
        notifications: [],
        revision: "3",
      });
    });

    it("timezone が設定されていれば timezone パラメータを送る", async () => {
      const updateReminderNotifications = vi.fn((_params: unknown) =>
        Promise.resolve({ revision: "4" }),
      );
      const client = createMockClient({ updateReminderNotifications });
      const configurator = new KintoneNotificationConfigurator(client, "1");

      await configurator.updateReminderNotifications({
        timezone: "UTC",
        notifications: [],
      });

      expect(updateReminderNotifications.mock.calls[0]?.[0]).toStrictEqual({
        app: "1",
        timezone: "UTC",
        notifications: [],
      });
    });
  });
});
