import assert from "node:assert";
import { describe, expect, it } from "vitest";
import { setupTestContainer } from "@/core/application/__tests__/helpers";
import { SystemError } from "@/core/application/error";
import { saveSchema } from "../saveSchema";

const getContainer = setupTestContainer();

describe("saveSchema", () => {
  it("スキーマテキストをストレージに保存する", async () => {
    const container = getContainer();
    const schemaText = "layout:\n  - type: ROW\n    fields: []\n";

    await saveSchema({ container, input: { schemaText } });

    const saved = await container.schemaStorage.get();
    assert(saved.exists);
    expect(saved.content).toBe(schemaText);
  });

  it("既存のスキーマを上書き保存する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("old content");

    const newSchema = "layout:\n  - type: ROW\n    fields: []\n";
    await saveSchema({ container, input: { schemaText: newSchema } });

    const saved = await container.schemaStorage.get();
    assert(saved.exists);
    expect(saved.content).toBe(newSchema);
  });

  it("空文字列でも保存できる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("existing");

    await saveSchema({ container, input: { schemaText: "" } });

    const saved = await container.schemaStorage.get();
    assert(saved.exists);
    expect(saved.content).toBe("");
  });

  it("SchemaStorage.update()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setFailOn("update");

    await expect(
      saveSchema({ container, input: { schemaText: "test" } }),
    ).rejects.toThrow(SystemError);
  });
});
