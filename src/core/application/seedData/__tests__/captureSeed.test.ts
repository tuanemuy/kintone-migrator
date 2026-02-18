import { describe, expect, it } from "vitest";
import type { SeedRecordWithId } from "@/core/domain/seedData/entity";
import {
  setupTestSeedContainer,
  type TestSeedContainer,
} from "../../__tests__/helpers";
import { captureSeed } from "../captureSeed";

const getContainer = setupTestSeedContainer();

function makeSeedRecord(
  id: string,
  fields: Record<string, string>,
): SeedRecordWithId {
  return { id, record: fields };
}

describe("captureSeed", () => {
  it("レコードをキャプチャしてYAMLテキストを返す", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeSeedRecord("10", { code: "001", name: "テスト1" }),
      makeSeedRecord("20", { code: "002", name: "テスト2" }),
    ]);

    const result = await captureSeed({
      container,
      input: { keyField: "code" },
    });

    expect(result.recordCount).toBe(2);
    expect(result.hasExistingSeed).toBe(false);
    expect(result.seedText).toContain("key: code");
    expect(result.seedText).toContain("001");
    expect(result.seedText).toContain("テスト1");
  });

  it("既存シードファイルがある場合にhasExistingSeedをtrueにする", async () => {
    const container: TestSeedContainer = getContainer();
    container.seedStorage.setContent("existing seed");
    container.recordManager.setRecords([
      makeSeedRecord("10", { code: "001", name: "テスト" }),
    ]);

    const result = await captureSeed({
      container,
      input: { keyField: "code" },
    });

    expect(result.hasExistingSeed).toBe(true);
  });

  it("レコードが0件の場合も正常に動作する", async () => {
    const container: TestSeedContainer = getContainer();

    const result = await captureSeed({
      container,
      input: { keyField: "code" },
    });

    expect(result.recordCount).toBe(0);
    expect(result.seedText).toContain("key: code");
    expect(result.seedText).toContain("records: []");
  });

  it("keyField未指定時はkeyなしでYAMLを生成する", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeSeedRecord("10", { code: "001", name: "テスト1" }),
    ]);

    const result = await captureSeed({
      container,
      input: {},
    });

    expect(result.recordCount).toBe(1);
    expect(result.seedText).not.toContain("key:");
    expect(result.seedText).toContain("001");
  });
});
