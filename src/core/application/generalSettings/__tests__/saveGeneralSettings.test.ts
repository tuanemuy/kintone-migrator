import assert from "node:assert";
import { describe, expect, it } from "vitest";
import {
  setupTestGeneralSettingsContainer,
  type TestGeneralSettingsContainer,
} from "../../__tests__/helpers";
import { saveGeneralSettings } from "../saveGeneralSettings";

const getContainer = setupTestGeneralSettingsContainer();

describe("saveGeneralSettings", () => {
  it("should save general settings text to storage", async () => {
    const container: TestGeneralSettingsContainer = getContainer();
    const configText = `
name: My App
theme: BLUE
enableThumbnails: true
`;
    await saveGeneralSettings({ container, input: { configText } });

    expect(container.generalSettingsStorage.callLog).toContain("update");
    const stored = await container.generalSettingsStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe(configText);
  });

  it("should overwrite existing settings", async () => {
    const container: TestGeneralSettingsContainer = getContainer();
    container.generalSettingsStorage.setContent("old config");

    await saveGeneralSettings({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.generalSettingsStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe("new config");
  });

  it("should propagate storage write failure", async () => {
    const container: TestGeneralSettingsContainer = getContainer();
    container.generalSettingsStorage.setFailOn("update");

    await expect(
      saveGeneralSettings({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
