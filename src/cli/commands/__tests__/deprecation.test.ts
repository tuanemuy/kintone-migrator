import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  log: {
    warn: vi.fn(),
  },
}));

import * as p from "@clack/prompts";
import { printDeprecationWarning } from "../../deprecation";

afterEach(() => {
  vi.clearAllMocks();
});

describe("printDeprecationWarning", () => {
  it("calls p.log.warn with the old command and replacement", () => {
    printDeprecationWarning({
      oldCommand: "schema migrate",
      replacement: "schema push",
    });

    expect(p.log.warn).toHaveBeenCalledTimes(1);
    const message = vi.mocked(p.log.warn).mock.calls[0][0];
    expect(message).toContain("schema migrate");
    expect(message).toContain("schema push");
    expect(message).toContain("[deprecated]");
  });

  it("includes the note when provided", () => {
    printDeprecationWarning({
      oldCommand: "seed apply",
      replacement: "seed push",
      note: "plain upsert without drift guard.",
    });

    const message = vi.mocked(p.log.warn).mock.calls[0][0];
    expect(message).toContain("plain upsert without drift guard.");
  });
});
