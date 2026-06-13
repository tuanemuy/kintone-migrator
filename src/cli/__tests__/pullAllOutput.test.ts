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
import type { PullAllForAppOutput } from "@/core/application/pullAll/pullAllForApp";
import { logError } from "../handleError";
import { printPullAllResults, pullAllHasFailure } from "../pullAllOutput";

afterEach(() => {
  vi.clearAllMocks();
});

describe("printPullAllResults", () => {
  it("ヘッダーに 'Pull Results:' が表示されること", () => {
    printPullAllResults({ revisionSkip: false, results: [] });

    const stepCalls = vi
      .mocked(p.log.step)
      .mock.calls.map((call) => call[0] as string);
    expect(stepCalls.some((l) => l.includes("Pull Results"))).toBe(true);
  });

  it("revisionSkip のときは success 文言のみで各ドメイン行を出さないこと", () => {
    printPullAllResults({ revisionSkip: true, results: [] });

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("Remote revision unchanged"),
    );
    expect(p.log.message).not.toHaveBeenCalled();
  });

  it("成功ドメインに checkmark を表示すること", () => {
    printPullAllResults({
      revisionSkip: false,
      results: [{ domain: "view", success: true, outcome: "merged" }],
    });

    const line = vi.mocked(p.log.message).mock.calls[0][0] as string;
    expect(line).toContain("✓");
    expect(line).toContain("View");
  });

  it("not-found skip と conflict skip と failed を行レベルで区別表示すること", () => {
    const output: PullAllForAppOutput = {
      revisionSkip: false,
      results: [
        { domain: "schema", success: false, skipped: "not-found" },
        { domain: "view", success: false, skipped: "conflict" },
        {
          domain: "report",
          success: false,
          error: new Error("boom"),
          skipped: false,
        },
      ],
    };

    printPullAllResults(output);

    const lines = vi
      .mocked(p.log.message)
      .mock.calls.map((call) => call[0] as string);
    const notFound = lines.find((l) => l.includes("Schema")) as string;
    const conflict = lines.find((l) => l.includes("View")) as string;
    const failed = lines.find((l) => l.includes("Report")) as string;

    expect(notFound).toContain("file not found");
    expect(conflict).toContain("conflict");
    // The conflict hint embeds the real CLI subcommand name, not a literal
    // `<domain>` placeholder (W-001).
    expect(conflict).toContain("`view pull`");
    expect(conflict).not.toContain("<domain>");
    expect(failed).toContain("failed");
    expect(failed).toContain("boom");

    // logError fires only for the genuine failure, not for the skips.
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it("conflict が 1 件以上あるとき個別 pull を促す warn を出すこと", () => {
    printPullAllResults({
      revisionSkip: false,
      results: [
        { domain: "view", success: false, skipped: "conflict" },
        { domain: "report", success: false, skipped: "conflict" },
      ],
    });

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("had conflicts"),
    );
    // The aggregate warning embeds the real conflicting subcommand names, not a
    // literal `<domain>` placeholder (W-001).
    const warn = vi.mocked(p.log.warn).mock.calls[0][0] as string;
    expect(warn).toContain("`view pull`");
    expect(warn).toContain("`report pull`");
    expect(warn).not.toContain("<domain>");
  });

  it("conflict が 0 件なら warn を出さないこと", () => {
    printPullAllResults({
      revisionSkip: false,
      results: [{ domain: "view", success: true, outcome: "force" }],
    });

    expect(p.log.warn).not.toHaveBeenCalled();
  });
});

describe("pullAllHasFailure", () => {
  it("全成功なら failure ではないこと", () => {
    expect(
      pullAllHasFailure({
        revisionSkip: false,
        results: [{ domain: "view", success: true, outcome: "merged" }],
      }),
    ).toBe(false);
  });

  it("revisionSkip（results 空）は failure ではないこと", () => {
    expect(pullAllHasFailure({ revisionSkip: true, results: [] })).toBe(false);
  });

  it("not-found / conflict skip は failure 扱いしないこと（回復可能）", () => {
    expect(
      pullAllHasFailure({
        revisionSkip: false,
        results: [
          { domain: "schema", success: false, skipped: "not-found" },
          { domain: "view", success: false, skipped: "conflict" },
        ],
      }),
    ).toBe(false);
  });

  it("execution error は failure 扱いすること", () => {
    expect(
      pullAllHasFailure({
        revisionSkip: false,
        results: [
          {
            domain: "view",
            success: false,
            error: new Error("x"),
            skipped: false,
          },
        ],
      }),
    ).toBe(true);
  });

  it("aborted skip は failure 扱いすること", () => {
    expect(
      pullAllHasFailure({
        revisionSkip: false,
        results: [
          {
            domain: "view",
            success: false,
            error: new Error("aborted"),
            skipped: "aborted",
          },
        ],
      }),
    ).toBe(true);
  });
});
