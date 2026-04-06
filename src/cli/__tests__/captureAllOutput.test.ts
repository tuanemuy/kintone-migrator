import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    step: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("../handleError", () => ({
  formatErrorForDisplay: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e),
  ),
  logError: vi.fn(),
}));

import * as p from "@clack/prompts";
import type {
  CaptureDomain,
  CaptureResult,
} from "@/core/application/init/captureAllForApp";
import type { AppFilePaths } from "@/core/domain/projectConfig/appFilePaths";
import { printCaptureAllResults } from "../captureAllOutput";
import { formatErrorForDisplay, logError } from "../handleError";

afterEach(() => {
  vi.clearAllMocks();
});

const ALL_DOMAINS: readonly CaptureDomain[] = [
  "schema",
  "customize",
  "seed",
  "view",
  "settings",
  "notification",
  "report",
  "action",
  "process",
  "field-acl",
  "app-acl",
  "record-acl",
  "admin-notes",
  "plugin",
];

const mockPaths: AppFilePaths = {
  schema: "myapp/schema.yaml",
  seed: "myapp/seed.yaml",
  customize: "myapp/customize.yaml",
  view: "myapp/view.yaml",
  settings: "myapp/settings.yaml",
  notification: "myapp/notification.yaml",
  report: "myapp/report.yaml",
  action: "myapp/action.yaml",
  process: "myapp/process.yaml",
  fieldAcl: "myapp/field-acl.yaml",
  appAcl: "myapp/app-acl.yaml",
  recordAcl: "myapp/record-acl.yaml",
  adminNotes: "myapp/admin-notes.yaml",
  plugin: "myapp/plugin.yaml",
};

describe("printCaptureAllResults", () => {
  it("ヘッダーに 'Capture Results:' が表示されること", () => {
    const results: CaptureResult[] = [
      { domain: "schema", success: true },
    ];

    printCaptureAllResults(results, mockPaths);

    expect(p.log.step).toHaveBeenCalledWith(
      expect.stringContaining("Capture Results"),
    );
  });

  it("空の結果配列でもクラッシュしないこと", () => {
    expect(() => printCaptureAllResults([], mockPaths)).not.toThrow();
  });

  it("全14ドメインが成功した場合、全てに ✓ を表示し Summary に succeeded を含む", () => {
    const results: CaptureResult[] = ALL_DOMAINS.map((domain) => ({
      domain,
      success: true as const,
    }));

    printCaptureAllResults(results, mockPaths);

    // 14 results + 2 separator lines + 1 header + 1 summary = 18 calls
    // Check that p.log.message was called 14 times for results + 1 for summary = 15
    const messageCalls = vi.mocked(p.log.message).mock.calls;
    expect(messageCalls).toHaveLength(15);

    // Verify each success message contains ✓ and the file path
    for (let i = 0; i < 14; i++) {
      const line = messageCalls[i][0] as string;
      expect(line).toContain("✓");
    }

    // Verify summary line
    const summaryLine = messageCalls[14][0] as string;
    expect(summaryLine).toContain("14");
    expect(summaryLine).toContain("succeeded");
  });

  it("全14ドメインが失敗した場合、全てに ✗ を表示し Summary に failed を含む", () => {
    const results: CaptureResult[] = ALL_DOMAINS.map((domain) => ({
      domain,
      success: false as const,
      error: new Error(`${domain} failed`),
    }));

    printCaptureAllResults(results, mockPaths);

    const messageCalls = vi.mocked(p.log.message).mock.calls;
    expect(messageCalls).toHaveLength(15);

    for (let i = 0; i < 14; i++) {
      const line = messageCalls[i][0] as string;
      expect(line).toContain("✗");
      expect(line).toContain("failed");
    }

    // logError should be called for each failure
    expect(logError).toHaveBeenCalledTimes(14);

    // formatErrorForDisplay should be called for each failure
    expect(formatErrorForDisplay).toHaveBeenCalledTimes(14);

    // Verify error messages are included in the output
    const firstLine = messageCalls[0][0] as string;
    expect(firstLine).toContain("schema failed");

    const summaryLine = messageCalls[14][0] as string;
    expect(summaryLine).toContain("14");
    expect(summaryLine).toContain("failed");
  });

  it("成功と失敗が混在する場合、Summary に両方を含む", () => {
    const results: CaptureResult[] = [
      { domain: "schema", success: true },
      { domain: "customize", success: false, error: new Error("API error") },
      { domain: "seed", success: true },
    ];

    printCaptureAllResults(results, mockPaths);

    const messageCalls = vi.mocked(p.log.message).mock.calls;
    expect(messageCalls).toHaveLength(4); // 3 results + 1 summary

    expect(messageCalls[0][0] as string).toContain("✓");
    expect(messageCalls[1][0] as string).toContain("✗");
    expect(messageCalls[2][0] as string).toContain("✓");

    const summaryLine = messageCalls[3][0] as string;
    expect(summaryLine).toContain("2");
    expect(summaryLine).toContain("succeeded");
    expect(summaryLine).toContain("1");
    expect(summaryLine).toContain("failed");
  });

  it("成功結果にドメインに対応する正しいファイルパスが表示される", () => {
    const results: CaptureResult[] = [
      { domain: "field-acl", success: true },
      { domain: "app-acl", success: true },
      { domain: "record-acl", success: true },
      { domain: "admin-notes", success: true },
    ];

    printCaptureAllResults(results, mockPaths);

    const messageCalls = vi.mocked(p.log.message).mock.calls;
    expect(messageCalls[0][0] as string).toContain("myapp/field-acl.yaml");
    expect(messageCalls[1][0] as string).toContain("myapp/app-acl.yaml");
    expect(messageCalls[2][0] as string).toContain("myapp/record-acl.yaml");
    expect(messageCalls[3][0] as string).toContain("myapp/admin-notes.yaml");
  });

  it("domainPathKey マッピングが全14ドメインをカバーしている", () => {
    // This test verifies completeness by passing all 14 domains and checking
    // that no error is thrown and all paths are resolved
    const results: CaptureResult[] = ALL_DOMAINS.map((domain) => ({
      domain,
      success: true as const,
    }));

    // Should not throw
    expect(() => printCaptureAllResults(results, mockPaths)).not.toThrow();

    const messageCalls = vi.mocked(p.log.message).mock.calls;
    // 14 result lines + 1 summary
    expect(messageCalls).toHaveLength(15);

    // All lines should contain "saved to" and a valid path (not "undefined")
    for (let i = 0; i < 14; i++) {
      const line = messageCalls[i][0] as string;
      expect(line).toContain("saved to");
      expect(line).not.toContain("undefined");
    }
  });
});
