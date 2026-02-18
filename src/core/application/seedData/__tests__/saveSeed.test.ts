import { describe, expect, it } from "vitest";
import {
  setupTestSeedContainer,
  type TestSeedContainer,
} from "../../__tests__/helpers";
import { saveSeed } from "../saveSeed";

const getContainer = setupTestSeedContainer();

describe("saveSeed", () => {
  it("シードテキストをストレージに保存する", async () => {
    const container: TestSeedContainer = getContainer();
    const seedText = `
key: code
records:
  - code: "001"
    name: "テスト"
`;
    await saveSeed({ container, input: { seedText } });

    expect(container.seedStorage.callLog).toContain("update");
    const stored = await container.seedStorage.get();
    expect(stored).toMatchObject({ content: seedText });
    expect(stored.exists).toBe(true);
  });

  it("空文字列でも保存できる", async () => {
    const container: TestSeedContainer = getContainer();
    await saveSeed({ container, input: { seedText: "" } });

    expect(container.seedStorage.callLog).toContain("update");
  });

  it("既存のシードを上書き保存する", async () => {
    const container: TestSeedContainer = getContainer();
    container.seedStorage.setContent("old content");

    await saveSeed({ container, input: { seedText: "new content" } });

    const stored = await container.seedStorage.get();
    expect(stored).toMatchObject({ content: "new content" });
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestSeedContainer = getContainer();
    container.seedStorage.setFailOn("update");

    await expect(
      saveSeed({ container, input: { seedText: "test" } }),
    ).rejects.toThrow();
  });
});
