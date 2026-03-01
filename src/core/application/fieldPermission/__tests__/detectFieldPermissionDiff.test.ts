import { describe, expect, it } from "vitest";
import { setupTestFieldPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectFieldPermissionDiff } from "../detectFieldPermissionDiff";

const VALID_CONFIG = `
rights:
  - code: name
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user1
`;

describe("detectFieldPermissionDiff", () => {
  const getContainer = setupTestFieldPermissionContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent(VALID_CONFIG);
      container.fieldPermissionConfigurator.setPermissions({
        rights: [
          {
            code: "name",
            entities: [
              {
                accessibility: "WRITE",
                entity: { type: "USER", code: "user1" },
              },
            ],
          },
        ],
        revision: "1",
      });

      const result = await detectFieldPermissionDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent(VALID_CONFIG);
      container.fieldPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });

      const result = await detectFieldPermissionDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.added).toBe(1);
      expect(result.summary.total).toBe(1);
    });

    it("should detect deleted field permission", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent(`
rights: []
`);
      container.fieldPermissionConfigurator.setPermissions({
        rights: [
          {
            code: "name",
            entities: [
              {
                accessibility: "WRITE",
                entity: { type: "USER", code: "user1" },
              },
            ],
          },
        ],
        revision: "1",
      });

      const result = await detectFieldPermissionDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.deleted).toBe(1);
      expect(result.entries[0].type).toBe("deleted");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectFieldPermissionDiff({ container })).rejects.toSatisfy(
        (error) => isValidationError(error) && error.code === "INVALID_INPUT",
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setFailOn("get");

      await expect(detectFieldPermissionDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent(VALID_CONFIG);
      container.fieldPermissionConfigurator.setFailOn("getFieldPermissions");

      await expect(detectFieldPermissionDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw ValidationError when config has invalid YAML", async () => {
      const container = getContainer();
      container.fieldPermissionStorage.setContent("{{invalid yaml");

      await expect(detectFieldPermissionDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });
  });
});
