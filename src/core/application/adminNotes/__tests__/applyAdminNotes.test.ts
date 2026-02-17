import { describe, expect, it } from "vitest";
import { setupTestAdminNotesContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyAdminNotes } from "../applyAdminNotes";

const VALID_CONFIG = `
content: |
  <p>This app is managed by kintone-migrator.</p>
includeInTemplateAndDuplicates: true
`;

describe("applyAdminNotes", () => {
  const getContainer = setupTestAdminNotesContainer();

  describe("success cases", () => {
    it("should read config and update admin notes", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent(VALID_CONFIG);

      await applyAdminNotes({ container });

      expect(container.adminNotesConfigurator.callLog).toEqual([
        "getAdminNotes",
        "updateAdminNotes",
      ]);
      expect(
        container.adminNotesConfigurator.lastUpdateParams?.config.content,
      ).toContain("kintone-migrator");
      expect(
        container.adminNotesConfigurator.lastUpdateParams?.config
          .includeInTemplateAndDuplicates,
      ).toBe(true);
      expect(container.adminNotesConfigurator.lastUpdateParams?.revision).toBe(
        "1",
      );
    });

    it("should pass revision from current admin notes", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent(VALID_CONFIG);
      container.adminNotesConfigurator.setConfig(
        {
          content: "",
          includeInTemplateAndDuplicates: false,
        },
        "42",
      );

      await applyAdminNotes({ container });

      expect(container.adminNotesConfigurator.lastUpdateParams?.revision).toBe(
        "42",
      );
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file does not exist", async () => {
      const container = getContainer();

      await expect(applyAdminNotes({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent("{ invalid: yaml:");

      await expect(applyAdminNotes({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when adminNotesStorage.get() fails", async () => {
      const container = getContainer();
      container.adminNotesStorage.setFailOn("get");

      await expect(applyAdminNotes({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when getAdminNotes() fails", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent(VALID_CONFIG);
      container.adminNotesConfigurator.setFailOn("getAdminNotes");

      await expect(applyAdminNotes({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when updateAdminNotes() fails", async () => {
      const container = getContainer();
      container.adminNotesStorage.setContent(VALID_CONFIG);
      container.adminNotesConfigurator.setFailOn("updateAdminNotes");

      await expect(applyAdminNotes({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
