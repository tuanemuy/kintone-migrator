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
import type { ApplyAllForAppOutput } from "@/core/application/applyAll/applyAllForApp";
import { printApplyAllResults } from "../applyAllOutput";
import { logError } from "../handleError";

afterEach(() => {
  vi.clearAllMocks();
});

function makeSuccessOutput(): ApplyAllForAppOutput {
  return {
    phases: [
      {
        phase: "Schema",
        results: [{ domain: "schema", success: true }],
      },
      {
        phase: "Views & Customization",
        results: [
          { domain: "customize", success: true },
          { domain: "view", success: true },
        ],
      },
      {
        phase: "Permissions",
        results: [
          { domain: "field-acl", success: true },
          { domain: "app-acl", success: true },
          { domain: "record-acl", success: true },
        ],
      },
      {
        phase: "Settings & Others",
        results: [
          { domain: "settings", success: true },
          { domain: "notification", success: true },
          { domain: "report", success: true },
          { domain: "action", success: true },
          { domain: "process", success: true },
          { domain: "admin-notes", success: true },
          { domain: "plugin", success: true },
        ],
      },
      {
        phase: "Seed Data",
        results: [{ domain: "seed", success: true }],
      },
    ],
    deployed: true,
  };
}

describe("printApplyAllResults", () => {
  it("ヘッダーに 'Apply Results:' が表示されること", () => {
    printApplyAllResults(makeSuccessOutput());

    expect(p.log.step).toHaveBeenCalledWith(
      expect.stringContaining("Apply Results"),
    );
  });

  it("全14ドメインが成功した場合、全てに checkmark を表示し Summary に succeeded を含む", () => {
    printApplyAllResults(makeSuccessOutput());

    const messageCalls = vi.mocked(p.log.message).mock.calls;
    // 14 results + 1 summary = 15 message calls
    expect(messageCalls).toHaveLength(15);

    // All result lines should contain checkmark
    for (let i = 0; i < 14; i++) {
      const line = messageCalls[i][0] as string;
      expect(line).toContain("\u2713");
    }

    // Summary line
    const summaryLine = messageCalls[14][0] as string;
    expect(summaryLine).toContain("14");
    expect(summaryLine).toContain("succeeded");
  });

  it("deployed が true の場合は 'Deployed to production.' が表示されること", () => {
    printApplyAllResults(makeSuccessOutput());

    expect(p.log.success).toHaveBeenCalledWith("Deployed to production.");
  });

  it("フェーズ名がヘッダーとして表示されること", () => {
    printApplyAllResults(makeSuccessOutput());

    const stepCalls = vi
      .mocked(p.log.step)
      .mock.calls.map((call) => call[0] as string);

    expect(stepCalls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Schema"),
        expect.stringContaining("Views & Customization"),
        expect.stringContaining("Permissions"),
        expect.stringContaining("Settings & Others"),
        expect.stringContaining("Seed Data"),
      ]),
    );
  });

  it("失敗結果に cross mark と failed が表示されること", () => {
    const output: ApplyAllForAppOutput = {
      phases: [
        {
          phase: "Schema",
          results: [
            {
              domain: "schema",
              success: false,
              error: new Error("migration failed"),
            },
          ],
        },
      ],
      deployed: false,
    };

    printApplyAllResults(output);

    const messageCalls = vi.mocked(p.log.message).mock.calls;
    const schemaLine = messageCalls[0][0] as string;
    expect(schemaLine).toContain("\u2717");
    expect(schemaLine).toContain("failed");
    expect(schemaLine).toContain("migration failed");

    expect(logError).toHaveBeenCalledTimes(1);
  });

  it("成功と失敗が混在する場合、Summary に両方を含む", () => {
    const output: ApplyAllForAppOutput = {
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: true }],
        },
        {
          phase: "Views & Customization",
          results: [
            {
              domain: "customize",
              success: false,
              error: new Error("API error"),
            },
            { domain: "view", success: true },
          ],
        },
      ],
      deployed: true,
    };

    printApplyAllResults(output);

    const messageCalls = vi.mocked(p.log.message).mock.calls;
    const summaryLine = messageCalls[messageCalls.length - 1][0] as string;
    expect(summaryLine).toContain("2");
    expect(summaryLine).toContain("succeeded");
    expect(summaryLine).toContain("1");
    expect(summaryLine).toContain("failed");
  });

  it("空の結果配列でもクラッシュしないこと", () => {
    const output: ApplyAllForAppOutput = {
      phases: [],
      deployed: false,
    };

    expect(() => printApplyAllResults(output)).not.toThrow();
  });

  it("deployed が false で成功ドメインがある場合に警告が表示されること", () => {
    const output: ApplyAllForAppOutput = {
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: true }],
        },
        {
          phase: "Views & Customization",
          results: [
            { domain: "customize", success: true },
            {
              domain: "view",
              success: false,
              error: new Error("view failed"),
            },
          ],
        },
      ],
      deployed: false,
    };

    printApplyAllResults(output);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("deployment may not have completed"),
    );
  });
});
