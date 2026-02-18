import assert from "node:assert";
import { describe, expect, it } from "vitest";
import {
  setupTestNotificationContainer,
  type TestNotificationContainer,
} from "../../__tests__/helpers";
import { saveNotification } from "../saveNotification";

const getContainer = setupTestNotificationContainer();

describe("saveNotification", () => {
  it("テキストをストレージに保存する", async () => {
    const container: TestNotificationContainer = getContainer();
    const configText = `
general:
  notifyToCommenter: true
  notifications: []
`;
    await saveNotification({ container, input: { configText } });

    expect(container.notificationStorage.callLog).toContain("update");
    const stored = await container.notificationStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe(configText);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestNotificationContainer = getContainer();
    container.notificationStorage.setContent("old config");

    await saveNotification({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.notificationStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe("new config");
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestNotificationContainer = getContainer();
    container.notificationStorage.setFailOn("update");

    await expect(
      saveNotification({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
