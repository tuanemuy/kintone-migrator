import { describe, expect, it } from "vitest";
import { buildConflictPrompt } from "../pull";

const KEY = "desktop:js:main.js";
const OTHER_KEY = "mobile:css:main.css";
const SCOPE_KEY = "config:scope";

const UNREADABLE_CAVEAT = "the local file could not be read";
const BASELINE_CAVEAT = "no recorded baseline for this file";

/** The merge facts the prompt reads, with every set empty by default. */
function context(
  keys: {
    unreadable?: readonly string[];
    conservative?: readonly string[];
    optimistic?: readonly string[];
  } = {},
) {
  return {
    unreadableLocalKeys: new Set(keys.unreadable ?? []),
    estimatedKeys: {
      conservative: new Set(keys.conservative ?? []),
      optimistic: new Set(keys.optimistic ?? []),
    },
  };
}

describe("buildConflictPrompt", () => {
  it("names the resource and says which choice replaces the copy on disk", () => {
    const message = buildConflictPrompt(context(), KEY);

    expect(message).toContain(`"${KEY}"`);
    expect(message).toContain("remote replaces the local file on disk");
    // `pull` writes nothing to kintone, so no choice can overwrite the remote.
    expect(message).toContain("the remote stays untouched");
    expect(message).not.toContain(UNREADABLE_CAVEAT);
    expect(message).not.toContain(BASELINE_CAVEAT);
  });

  it("does not point at --force", () => {
    expect(buildConflictPrompt(context(), KEY)).not.toContain("--force");
    expect(buildConflictPrompt(context(), SCOPE_KEY)).not.toContain("--force");
  });

  it("describes the scope conflict as a scope, not as a file on disk", () => {
    const message = buildConflictPrompt(context(), SCOPE_KEY);

    expect(message).toContain("Conflict on scope");
    expect(message).toContain("remote takes the remote scope");
    expect(message).not.toContain("file on disk");
    expect(message).not.toContain(`"${SCOPE_KEY}"`);
    expect(message).toContain("the remote stays untouched");
  });

  it("flags an unreadable local file, keeping the destructive direction visible", () => {
    const message = buildConflictPrompt(context({ unreadable: [KEY] }), KEY);

    expect(message).toContain(UNREADABLE_CAVEAT);
    expect(message).not.toContain(BASELINE_CAVEAT);
    expect(message).toContain("remote replaces the local file on disk");
  });

  it("flags a conservatively estimated key as a missing baseline", () => {
    const message = buildConflictPrompt(context({ conservative: [KEY] }), KEY);

    expect(message).toContain(BASELINE_CAVEAT);
    expect(message).not.toContain(UNREADABLE_CAVEAT);
    expect(message).toContain("remote replaces the local file on disk");
  });

  it("prefers the unreadable caveat when both apply to the same key", () => {
    const message = buildConflictPrompt(
      context({ unreadable: [KEY], conservative: [KEY] }),
      KEY,
    );

    expect(message).toContain(UNREADABLE_CAVEAT);
    expect(message).not.toContain(BASELINE_CAVEAT);
  });

  it("adds no caveat for an optimistically estimated key", () => {
    const message = buildConflictPrompt(context({ optimistic: [KEY] }), KEY);

    expect(message).toBe(buildConflictPrompt(context(), KEY));
  });

  it("adds no caveat when only another key is flagged", () => {
    const message = buildConflictPrompt(
      context({ unreadable: [OTHER_KEY], conservative: [OTHER_KEY] }),
      KEY,
    );

    expect(message).toBe(buildConflictPrompt(context(), KEY));
  });
});
