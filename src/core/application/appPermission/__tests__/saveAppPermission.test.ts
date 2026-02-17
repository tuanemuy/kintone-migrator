import { describe, expect, it } from "vitest";
import {
  setupTestAppPermissionContainer,
  type TestAppPermissionContainer,
} from "../../__tests__/helpers";
import { saveAppPermission } from "../saveAppPermission";

const getContainer = setupTestAppPermissionContainer();

describe("saveAppPermission", () => {
  it("should save app permission config text to storage", async () => {
    const container: TestAppPermissionContainer = getContainer();
    const configText = `
rights:
  - entity:
      type: GROUP
      code: Administrators
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
`;
    await saveAppPermission({ container, input: { configText } });

    expect(container.appPermissionStorage.callLog).toContain("update");
    const stored = await container.appPermissionStorage.get();
    expect(stored.content).toBe(configText);
    expect(stored.exists).toBe(true);
  });

  it("should overwrite existing config", async () => {
    const container: TestAppPermissionContainer = getContainer();
    container.appPermissionStorage.setContent("old config");

    await saveAppPermission({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.appPermissionStorage.get();
    expect(stored.content).toBe("new config");
  });

  it("should propagate error when storage write fails", async () => {
    const container: TestAppPermissionContainer = getContainer();
    container.appPermissionStorage.setFailOn("update");

    await expect(
      saveAppPermission({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
