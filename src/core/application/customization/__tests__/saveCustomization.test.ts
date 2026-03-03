import assert from "node:assert";
import { describe, expect, it } from "vitest";
import {
  setupTestCustomizationContainer,
  type TestCustomizationContainer,
} from "../../__tests__/helpers";
import { saveCustomization } from "../saveCustomization";

const getContainer = setupTestCustomizationContainer();

describe("saveCustomization", () => {
  it("カスタマイズ設定テキストをストレージに保存する", async () => {
    const container: TestCustomizationContainer = getContainer();
    const configText = `
scope: ALL
desktop:
  js: []
  css: []
mobile:
  js: []
  css: []
`;
    await saveCustomization({ container, input: { configText } });

    expect(container.customizationStorage.callLog).toContain("update");
    const stored = await container.customizationStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe(configText);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestCustomizationContainer = getContainer();
    container.customizationStorage.setContent("old config");

    await saveCustomization({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.customizationStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe("new config");
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestCustomizationContainer = getContainer();
    container.customizationStorage.setFailOn("update");

    await expect(
      saveCustomization({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
