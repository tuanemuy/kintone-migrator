import { describe, expect, it } from "vitest";
import {
  setupTestRecordPermissionContainer,
  type TestRecordPermissionContainer,
} from "../../__tests__/helpers";
import { saveRecordPermission } from "../saveRecordPermission";

const getContainer = setupTestRecordPermissionContainer();

describe("saveRecordPermission", () => {
  it("レコード権限テキストをストレージに保存する", async () => {
    const container: TestRecordPermissionContainer = getContainer();
    const configText = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;
    await saveRecordPermission({ container, input: { configText } });

    expect(container.recordPermissionStorage.callLog).toContain("update");
    const stored = await container.recordPermissionStorage.get();
    expect(stored).toMatchObject({ content: configText });
    expect(stored.exists).toBe(true);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestRecordPermissionContainer = getContainer();
    container.recordPermissionStorage.setContent("old config");

    await saveRecordPermission({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.recordPermissionStorage.get();
    expect(stored).toMatchObject({ content: "new config" });
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestRecordPermissionContainer = getContainer();
    container.recordPermissionStorage.setFailOn("update");

    await expect(
      saveRecordPermission({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
