import { describe, expect, it } from "vitest";
import { buildConflictPrompt } from "../pull";

describe("buildConflictPrompt", () => {
  const KEY = "desktop:js:main.js";

  it("names the file and says which choice replaces the copy on disk", () => {
    const message = buildConflictPrompt(KEY, undefined);

    expect(message).toContain(`"${KEY}"`);
    expect(message).toContain("remote replaces the local file on disk");
    // `pull` writes nothing to kintone, so no choice can overwrite the remote.
    expect(message).toContain("the remote stays untouched");
    expect(message).not.toContain("the side you drop is overwritten");
  });

  it("does not point at --force", () => {
    expect(buildConflictPrompt(KEY, undefined)).not.toContain("--force");
  });

  it("keeps the destructive direction visible alongside a caveat", () => {
    const message = buildConflictPrompt(
      KEY,
      "the local file could not be read, so this may not be a real conflict",
    );

    expect(message).toContain("the local file could not be read");
    expect(message).toContain("remote replaces the local file on disk");
  });
});
