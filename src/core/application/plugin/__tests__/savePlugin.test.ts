import { describe, expect, it } from "vitest";
import {
  setupTestPluginContainer,
  type TestPluginContainer,
} from "../../__tests__/helpers";
import { savePlugin } from "../savePlugin";

const getContainer = setupTestPluginContainer();

describe("savePlugin", () => {
  it("プラグイン設定テキストをストレージに保存する", async () => {
    const container: TestPluginContainer = getContainer();
    const configText = `
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: 条件分岐プラグイン
`;
    await savePlugin({ container, input: { configText } });

    expect(container.pluginStorage.callLog).toContain("update");
    const stored = await container.pluginStorage.get();
    expect(stored.content).toBe(configText);
    expect(stored.exists).toBe(true);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestPluginContainer = getContainer();
    container.pluginStorage.setContent("old config");

    await savePlugin({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.pluginStorage.get();
    expect(stored.content).toBe("new config");
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestPluginContainer = getContainer();
    container.pluginStorage.setFailOn("update");

    await expect(
      savePlugin({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
