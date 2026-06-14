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
import type { PushAllForAppOutput } from "@/core/application/pushAll/pushAllForApp";
import { logError } from "../handleError";
import { printPushAllResults, pushAllHasFailure } from "../pushAllOutput";

afterEach(() => {
  vi.clearAllMocks();
});

describe("printPushAllResults", () => {
  it("ヘッダーに 'Push Results:' とフェーズ名を表示すること", () => {
    const output: PushAllForAppOutput = {
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: true, warnings: [] }],
        },
        {
          phase: "Views & Customization",
          results: [{ domain: "view", success: true, warnings: [] }],
        },
      ],
      deployed: true,
    };

    printPushAllResults(output);

    const stepCalls = vi
      .mocked(p.log.step)
      .mock.calls.map((call) => call[0] as string);
    expect(stepCalls.some((l) => l.includes("Push Results"))).toBe(true);
    expect(stepCalls.some((l) => l.includes("Schema"))).toBe(true);
    expect(stepCalls.some((l) => l.includes("Views & Customization"))).toBe(
      true,
    );
  });

  it("deployed が true のとき 'Deployed to production.' を表示すること", () => {
    printPushAllResults({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: true, warnings: [] }],
        },
      ],
      deployed: true,
    });

    expect(p.log.success).toHaveBeenCalledWith("Deployed to production.");
  });

  it("deployError があるとき deploy 失敗を error 表示すること", () => {
    printPushAllResults({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: true, warnings: [] }],
        },
      ],
      deployed: false,
      deployError: new Error("Deploy API timeout"),
    });

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("Deploy API timeout"),
    );
  });

  it("not-found / drift skip と failed を行レベルで区別表示すること", () => {
    const output: PushAllForAppOutput = {
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: false, skipped: "not-found" }],
        },
        {
          phase: "Views & Customization",
          results: [
            {
              domain: "view",
              success: false,
              error: new Error("remote drifted"),
              skipped: "drift",
            },
            {
              domain: "customize",
              success: false,
              error: new Error("boom"),
              skipped: false,
            },
          ],
        },
      ],
      deployed: false,
    };

    printPushAllResults(output);

    const lines = vi
      .mocked(p.log.message)
      .mock.calls.map((call) => call[0] as string);
    const notFound = lines.find((l) => l.includes("Schema")) as string;
    const drift = lines.find((l) => l.includes("View")) as string;
    const failed = lines.find((l) => l.includes("Customization")) as string;

    expect(notFound).toContain("file not found");
    expect(drift).toContain("drifted");
    // The drift hint embeds the real CLI subcommand name, not a literal
    // `<domain>` placeholder.
    expect(drift).toContain("`view pull`");
    expect(drift).not.toContain("<domain>");
    expect(failed).toContain("failed");
    expect(failed).toContain("boom");

    // logError fires only for the genuine failure (drift/not-found are expected).
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it("plugin の warning を当該ドメイン行直後に warn 表示し、成否/exit を変えないこと（AC-6/AC-7）", () => {
    const output: PushAllForAppOutput = {
      phases: [
        {
          phase: "Settings & Others",
          results: [
            {
              domain: "plugin",
              success: true,
              warnings: [
                {
                  domain: "plugin",
                  message:
                    "Cannot add plugins in a disabled state via the kintone API (add-only; adding would force-enable them); not added — set enabled: false manually in the kintone admin UI: plugA",
                },
              ],
            },
          ],
        },
      ],
      deployed: true,
    };

    printPushAllResults(output);

    const warnCalls = vi
      .mocked(p.log.warn)
      .mock.calls.map((call) => call[0] as string);
    expect(warnCalls).toContain(
      "Cannot add plugins in a disabled state via the kintone API (add-only; adding would force-enable them); not added — set enabled: false manually in the kintone admin UI: plugA",
    );
    // Warning does not produce a logError and does not flip the exit verdict.
    expect(logError).not.toHaveBeenCalled();
    expect(pushAllHasFailure(output)).toBe(false);
  });

  it("空 phases でもクラッシュしないこと", () => {
    expect(() =>
      printPushAllResults({ phases: [], deployed: false }),
    ).not.toThrow();
  });
});

describe("pushAllHasFailure", () => {
  it("全成功 + deployed なら failure ではないこと", () => {
    expect(
      pushAllHasFailure({
        phases: [
          {
            phase: "Schema",
            results: [{ domain: "schema", success: true, warnings: [] }],
          },
        ],
        deployed: true,
      }),
    ).toBe(false);
  });

  it("not-found / drift skip は failure 扱いしないこと（回復可能）", () => {
    expect(
      pushAllHasFailure({
        phases: [
          {
            phase: "Schema",
            results: [
              { domain: "schema", success: false, skipped: "not-found" },
            ],
          },
          {
            phase: "Views & Customization",
            results: [
              {
                domain: "view",
                success: false,
                error: new Error("drift"),
                skipped: "drift",
              },
            ],
          },
        ],
        deployed: false,
      }),
    ).toBe(false);
  });

  it("execution error は failure 扱いすること", () => {
    expect(
      pushAllHasFailure({
        phases: [
          {
            phase: "Schema",
            results: [
              {
                domain: "schema",
                success: false,
                error: new Error("x"),
                skipped: false,
              },
            ],
          },
        ],
        deployed: false,
      }),
    ).toBe(true);
  });

  it("aborted skip は failure 扱いすること", () => {
    expect(
      pushAllHasFailure({
        phases: [
          {
            phase: "Schema",
            results: [
              {
                domain: "schema",
                success: false,
                error: new Error("aborted"),
                skipped: "aborted",
              },
            ],
          },
        ],
        deployed: false,
      }),
    ).toBe(true);
  });

  it("deployError があれば（タスク成功でも）failure 扱いすること", () => {
    expect(
      pushAllHasFailure({
        phases: [
          {
            phase: "Schema",
            results: [{ domain: "schema", success: true, warnings: [] }],
          },
        ],
        deployed: false,
        deployError: new Error("deploy failed"),
      }),
    ).toBe(true);
  });
});
