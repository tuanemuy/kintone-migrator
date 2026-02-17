import { describe, expect, it } from "vitest";
import { setupTestAdminNotesContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureAdminNotes } from "../captureAdminNotes";

describe("captureAdminNotes", () => {
  const getContainer = setupTestAdminNotesContainer();

  describe("success cases", () => {
    it("should capture admin notes and serialize to YAML", async () => {
      const container = getContainer();
      container.adminNotesConfigurator.setConfig({
        content: "<p>Test memo</p>",
        includeInTemplateAndDuplicates: true,
      });

      const result = await captureAdminNotes({ container });

      expect(result.configText).toContain("<p>Test memo</p>");
      expect(result.configText).toContain(
        "includeInTemplateAndDuplicates: true",
      );
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.adminNotesConfigurator.setConfig({
        content: "",
        includeInTemplateAndDuplicates: false,
      });
      container.adminNotesStorage.setContent("existing content");

      const result = await captureAdminNotes({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.adminNotesConfigurator.setConfig({
        content: "",
        includeInTemplateAndDuplicates: false,
      });

      const result = await captureAdminNotes({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getAdminNotes() fails", async () => {
      const container = getContainer();
      container.adminNotesConfigurator.setFailOn("getAdminNotes");

      await expect(captureAdminNotes({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when adminNotesStorage.get() fails", async () => {
      const container = getContainer();
      container.adminNotesStorage.setFailOn("get");

      await expect(captureAdminNotes({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
