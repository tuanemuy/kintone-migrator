import { describe, expect, it } from "vitest";
import {
  setupTestProcessManagementContainer,
  type TestProcessManagementContainer,
} from "../../__tests__/helpers";
import { saveProcessManagement } from "../saveProcessManagement";

const getContainer = setupTestProcessManagementContainer();

describe("saveProcessManagement", () => {
  it("設定テキストをストレージに保存する", async () => {
    const container: TestProcessManagementContainer = getContainer();
    const configText = `
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
actions: []
`;
    await saveProcessManagement({ container, input: { configText } });

    expect(container.processManagementStorage.callLog).toContain("update");
    const stored = await container.processManagementStorage.get();
    expect(stored).toMatchObject({ content: configText });
    expect(stored.exists).toBe(true);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestProcessManagementContainer = getContainer();
    container.processManagementStorage.setContent("old config");

    await saveProcessManagement({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.processManagementStorage.get();
    expect(stored).toMatchObject({ content: "new config" });
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestProcessManagementContainer = getContainer();
    container.processManagementStorage.setFailOn("update");

    await expect(
      saveProcessManagement({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
