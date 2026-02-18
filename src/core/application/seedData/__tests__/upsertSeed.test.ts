import { describe, expect, it } from "vitest";
import type { SeedRecordWithId } from "@/core/domain/seedData/entity";
import {
  setupTestSeedContainer,
  type TestSeedContainer,
} from "../../__tests__/helpers";
import { upsertSeed } from "../upsertSeed";

const getContainer = setupTestSeedContainer();

function makeSeedRecord(
  id: string,
  fields: Record<string, string>,
): SeedRecordWithId {
  return { id, record: fields };
}

describe("upsertSeed", () => {
  it("全レコードを追加する（既存レコードなし）", async () => {
    const container: TestSeedContainer = getContainer();
    container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "テスト1"
  - code: "002"
    name: "テスト2"
`);

    const result = await upsertSeed({ container, input: {} });

    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.total).toBe(2);
    expect(container.recordManager.callLog).toContain("addRecords");
  });

  it("既存レコードを更新する", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeSeedRecord("10", { code: "001", name: "更新前" }),
    ]);
    container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "更新後"
`);

    const result = await upsertSeed({ container, input: {} });

    expect(result.added).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.total).toBe(1);
    expect(container.recordManager.callLog).toContain("updateRecords");
  });

  it("変更なしの場合はadd/updateを呼ばない", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeSeedRecord("10", { code: "001", name: "テスト" }),
    ]);
    container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "テスト"
`);

    const result = await upsertSeed({ container, input: {} });

    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(1);
    expect(result.deleted).toBe(0);
    expect(result.total).toBe(1);
    expect(container.recordManager.callLog).not.toContain("addRecords");
    expect(container.recordManager.callLog).not.toContain("updateRecords");
  });

  it("keyなしシードで全レコードがaddされる", async () => {
    const container: TestSeedContainer = getContainer();
    container.seedStorage.setContent(`
records:
  - name: "テスト1"
  - name: "テスト2"
  - name: "テスト3"
`);

    const result = await upsertSeed({ container, input: {} });

    expect(result.added).toBe(3);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.total).toBe(3);
    expect(container.recordManager.callLog).toContain("addRecords");
    expect(container.recordManager.callLog).not.toContain("getAllRecords");
  });

  it("keyなしシードでgetAllRecordsが呼ばれない", async () => {
    const container: TestSeedContainer = getContainer();
    container.seedStorage.setContent(`
records:
  - name: "テスト1"
`);

    await upsertSeed({ container, input: {} });

    expect(container.recordManager.callLog).not.toContain("getAllRecords");
    expect(container.recordManager.callLog).not.toContain("updateRecords");
  });

  it("keyなしシードでレコードが空の場合addRecordsを呼ばない", async () => {
    const container: TestSeedContainer = getContainer();
    container.seedStorage.setContent(`
records: []
`);

    const result = await upsertSeed({ container, input: {} });

    expect(result.added).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.total).toBe(0);
    expect(container.recordManager.callLog).not.toContain("addRecords");
  });

  it("追加・更新・変更なしを混在して処理する", async () => {
    const container: TestSeedContainer = getContainer();
    container.recordManager.setRecords([
      makeSeedRecord("10", { code: "001", name: "変更なし" }),
      makeSeedRecord("20", { code: "002", name: "更新前" }),
    ]);
    container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "変更なし"
  - code: "002"
    name: "更新後"
  - code: "003"
    name: "新規"
`);

    const result = await upsertSeed({ container, input: {} });

    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(1);
    expect(result.deleted).toBe(0);
    expect(result.total).toBe(3);
  });

  it("シードファイルが存在しない場合、ValidationErrorをスローする", async () => {
    const container: TestSeedContainer = getContainer();
    // seedStorage に何もセットしない（exists = false）

    await expect(upsertSeed({ container, input: {} })).rejects.toThrow(
      "Seed file not found",
    );
  });

  describe("clean mode", () => {
    it("全削除→全追加が実行される", async () => {
      const container: TestSeedContainer = getContainer();
      container.recordManager.setRecords([
        makeSeedRecord("10", { code: "001", name: "既存1" }),
        makeSeedRecord("20", { code: "002", name: "既存2" }),
      ]);
      container.seedStorage.setContent(`
key: code
records:
  - code: "003"
    name: "新規1"
  - code: "004"
    name: "新規2"
  - code: "005"
    name: "新規3"
`);

      const result = await upsertSeed({
        container,
        input: { clean: true },
      });

      expect(result.deleted).toBe(2);
      expect(result.added).toBe(3);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(0);
      expect(result.total).toBe(3);
      expect(container.recordManager.callLog).toEqual([
        "deleteAllRecords",
        "addRecords",
      ]);
    });

    it("空アプリ（レコード0件）の場合でも動作する", async () => {
      const container: TestSeedContainer = getContainer();
      container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "新規1"
`);

      const result = await upsertSeed({
        container,
        input: { clean: true },
      });

      expect(result.deleted).toBe(0);
      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(0);
      expect(result.total).toBe(1);
    });

    it("レコード0件のシードの場合は削除のみ", async () => {
      const container: TestSeedContainer = getContainer();
      container.recordManager.setRecords([
        makeSeedRecord("10", { code: "001", name: "既存1" }),
      ]);
      container.seedStorage.setContent(`
records: []
`);

      const result = await upsertSeed({
        container,
        input: { clean: true },
      });

      expect(result.deleted).toBe(1);
      expect(result.added).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(0);
      expect(result.total).toBe(0);
      expect(container.recordManager.callLog).toEqual(["deleteAllRecords"]);
      expect(container.recordManager.callLog).not.toContain("addRecords");
    });

    it("upsert keyが無視される（keyありでも全削除→全追加）", async () => {
      const container: TestSeedContainer = getContainer();
      container.recordManager.setRecords([
        makeSeedRecord("10", { code: "001", name: "既存" }),
      ]);
      container.seedStorage.setContent(`
key: code
records:
  - code: "001"
    name: "同じキーだが全追加される"
`);

      const result = await upsertSeed({
        container,
        input: { clean: true },
      });

      expect(result.deleted).toBe(1);
      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(0);
      expect(container.recordManager.callLog).not.toContain("getAllRecords");
      expect(container.recordManager.callLog).not.toContain("updateRecords");
    });

    it("通常モードではdeleted: 0が返る", async () => {
      const container: TestSeedContainer = getContainer();
      container.seedStorage.setContent(`
records:
  - name: "テスト"
`);

      const result = await upsertSeed({ container, input: {} });

      expect(result.deleted).toBe(0);
    });
  });
});
