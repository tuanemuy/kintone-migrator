import { describe, expect, it } from "vitest";
import {
  setupTestFieldPermissionContainer,
  type TestFieldPermissionContainer,
} from "../../__tests__/helpers";
import { saveFieldPermission } from "../saveFieldPermission";

const getContainer = setupTestFieldPermissionContainer();

describe("saveFieldPermission", () => {
  it("フィールド権限テキストをストレージに保存する", async () => {
    const container: TestFieldPermissionContainer = getContainer();
    const configText = `
rights:
  - code: name
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user1
`;
    await saveFieldPermission({ container, input: { configText } });

    expect(container.fieldPermissionStorage.callLog).toContain("update");
    const stored = await container.fieldPermissionStorage.get();
    expect(stored).toMatchObject({ content: configText });
    expect(stored.exists).toBe(true);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestFieldPermissionContainer = getContainer();
    container.fieldPermissionStorage.setContent("old config");

    await saveFieldPermission({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.fieldPermissionStorage.get();
    expect(stored).toMatchObject({ content: "new config" });
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestFieldPermissionContainer = getContainer();
    container.fieldPermissionStorage.setFailOn("update");

    await expect(
      saveFieldPermission({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
