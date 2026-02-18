import assert from "node:assert";
import { describe, expect, it } from "vitest";
import {
  setupTestAdminNotesContainer,
  type TestAdminNotesContainer,
} from "../../__tests__/helpers";
import { saveAdminNotes } from "../saveAdminNotes";

const getContainer = setupTestAdminNotesContainer();

describe("saveAdminNotes", () => {
  it("管理者用メモテキストをストレージに保存する", async () => {
    const container: TestAdminNotesContainer = getContainer();
    const configText = `
content: |
  <p>Test memo</p>
includeInTemplateAndDuplicates: true
`;
    await saveAdminNotes({ container, input: { configText } });

    expect(container.adminNotesStorage.callLog).toContain("update");
    const stored = await container.adminNotesStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe(configText);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestAdminNotesContainer = getContainer();
    container.adminNotesStorage.setContent("old config");

    await saveAdminNotes({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.adminNotesStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe("new config");
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestAdminNotesContainer = getContainer();
    container.adminNotesStorage.setFailOn("update");

    await expect(
      saveAdminNotes({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
