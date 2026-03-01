import { describe, expect, it } from "vitest";
import { setupTestAdminNotesContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectAdminNotesDiff } from "../detectAdminNotesDiff";

const VALID_CONFIG = `
content: |
  <p>Test memo</p>
includeInTemplateAndDuplicates: true
`;

describe("detectAdminNotesDiff", () => {
  const getContainer = setupTestAdminNotesContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent(VALID_CONFIG);
      container.adminNotesConfigurator.setConfig({
        content: "<p>Test memo</p>\n",
        includeInTemplateAndDuplicates: true,
      });

      const result = await detectAdminNotesDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent(VALID_CONFIG);
      container.adminNotesConfigurator.setConfig({
        content: "<p>Different memo</p>",
        includeInTemplateAndDuplicates: false,
      });

      const result = await detectAdminNotesDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.modified).toBe(2);
      expect(result.summary.total).toBe(2);
    });

    it("should detect no changes when both configs are empty", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent(`
content: ""
includeInTemplateAndDuplicates: false
`);
      container.adminNotesConfigurator.setConfig({
        content: "",
        includeInTemplateAndDuplicates: false,
      });

      const result = await detectAdminNotesDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.summary.total).toBe(0);
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectAdminNotesDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.adminNotesStorage.setFailOn("get");

      await expect(detectAdminNotesDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent(VALID_CONFIG);
      container.adminNotesConfigurator.setFailOn("getAdminNotes");

      await expect(detectAdminNotesDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw ValidationError when config has invalid YAML", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent("{{invalid yaml");

      await expect(detectAdminNotesDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });
  });
});
