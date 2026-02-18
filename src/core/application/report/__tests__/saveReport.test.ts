import assert from "node:assert";
import { describe, expect, it } from "vitest";
import {
  setupTestReportContainer,
  type TestReportContainer,
} from "../../__tests__/helpers";
import { saveReport } from "../saveReport";

const getContainer = setupTestReportContainer();

describe("saveReport", () => {
  it("レポート設定テキストをストレージに保存する", async () => {
    const container: TestReportContainer = getContainer();
    const configText = `
reports:
  テスト:
    chartType: BAR
    chartMode: NORMAL
    index: 0
    groups: []
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts: []
`;
    await saveReport({ container, input: { configText } });

    expect(container.reportStorage.callLog).toContain("update");
    const stored = await container.reportStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe(configText);
  });

  it("既存の設定を上書き保存する", async () => {
    const container: TestReportContainer = getContainer();
    container.reportStorage.setContent("old config");

    await saveReport({
      container,
      input: { configText: "new config" },
    });

    const stored = await container.reportStorage.get();
    assert(stored.exists);
    expect(stored.content).toBe("new config");
  });

  it("ストレージの書き込み失敗時にエラーが伝播する", async () => {
    const container: TestReportContainer = getContainer();
    container.reportStorage.setFailOn("update");

    await expect(
      saveReport({ container, input: { configText: "test" } }),
    ).rejects.toThrow();
  });
});
