import { describe, expect, it } from "vitest";
import type { AdminNotesConfig } from "../../entity";
import { AdminNotesDiffDetector } from "../diffDetector";

function makeConfig(
  overrides: Partial<AdminNotesConfig> = {},
): AdminNotesConfig {
  return {
    content: "default content",
    includeInTemplateAndDuplicates: false,
    ...overrides,
  };
}

describe("AdminNotesDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const config = makeConfig();
      const result = AdminNotesDiffDetector.detect(config, config);
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });
  });

  describe("modified", () => {
    it("should detect content change", () => {
      const local = makeConfig({ content: "new content" });
      const remote = makeConfig({ content: "old content" });
      const result = AdminNotesDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].field).toBe("content");
    });

    it("should detect includeInTemplateAndDuplicates change", () => {
      const local = makeConfig({ includeInTemplateAndDuplicates: true });
      const remote = makeConfig({ includeInTemplateAndDuplicates: false });
      const result = AdminNotesDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].field).toBe("includeInTemplateAndDuplicates");
      expect(result.entries[0].details).toContain("false");
      expect(result.entries[0].details).toContain("true");
    });

    it("should detect multiple changes", () => {
      const local = makeConfig({
        content: "new",
        includeInTemplateAndDuplicates: true,
      });
      const remote = makeConfig({
        content: "old",
        includeInTemplateAndDuplicates: false,
      });
      const result = AdminNotesDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(2);
      expect(result.summary.modified).toBe(2);
      expect(result.summary.total).toBe(2);
    });
  });

  describe("added/deleted are always 0", () => {
    it("should always have 0 added and 0 deleted", () => {
      const local = makeConfig({ content: "new" });
      const remote = makeConfig({ content: "old" });
      const result = AdminNotesDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(0);
      expect(result.summary.deleted).toBe(0);
    });
  });
});
