import { describe, expect, it } from "vitest";
import type { KintoneRecordForResponse } from "@/core/domain/seedData/ports/recordManager";
import {
  setupTestSeedContainer,
  type TestSeedContainer,
} from "../../__tests__/helpers";
import { captureSeed } from "../captureSeed";

const getContainer = setupTestSeedContainer();

function makeKintoneRecord(
  id: string,
  fields: Record<string, unknown>,
): KintoneRecordForResponse {
  const record: Record<string, { value: unknown }> = {
    $id: { value: id },
  };
  for (const [key, value] of Object.entries(fields)) {
    record[key] = { value };
  }
  return record as unknown as KintoneRecordForResponse;
}

describe("captureSeed", () => {
  it("レコードをキャプチャしてYAMLテキストを返す", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeKintoneRecord("10", { code: "001", name: "テスト1" }),
      makeKintoneRecord("20", { code: "002", name: "テスト2" }),
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
      makeKintoneRecord("10", { code: "001", name: "テスト" }),
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
});
