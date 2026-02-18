import assert from "node:assert";
import { describe, expect, it } from "vitest";
import {
  setupTestActionContainer,
  type TestActionContainer,
} from "../../__tests__/helpers";
import { saveAction } from "../saveAction";

const getContainer = setupTestActionContainer();

describe("saveAction", () => {
  it("アクション設定テキストをストレージに保存する", async () => {
    const container: TestActionContainer = getContainer();
    const configText = `
actions:
  test:
    index: 0
    destApp:
      code: target-app
    mappings: []
    entities: []
`;
    await saveAction({ container, input: { configText } });

    expect(container.actionStorage.callLog).toContain("update");
    const stored = await container.actionStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe(configText);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestActionContainer = getContainer();
    container.actionStorage.setContent("old config");

    await saveAction({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.actionStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe("new config");
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestActionContainer = getContainer();
    container.actionStorage.setFailOn("update");

    await expect(
      saveAction({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
