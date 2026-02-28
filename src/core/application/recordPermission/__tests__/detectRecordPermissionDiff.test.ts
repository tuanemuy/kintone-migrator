import { describe, expect, it } from "vitest";
import { setupTestRecordPermissionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectRecordPermissionDiff } from "../detectRecordPermissionDiff";

const VALID_CONFIG = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;

describe("detectRecordPermissionDiff", () => {
  const getContainer = setupTestRecordPermissionContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent(VALID_CONFIG);
      container.recordPermissionConfigurator.setPermissions({
        rights: [
          {
            filterCond: "",
            entities: [
              {
                entity: { type: "USER", code: "user1" },
                viewable: true,
                editable: false,
                deletable: false,
                includeSubs: false,
              },
            ],
          },
        ],
        revision: "1",
      });

      const result = await detectRecordPermissionDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent(VALID_CONFIG);
      container.recordPermissionConfigurator.setPermissions({
        rights: [],
        revision: "1",
      });

      const result = await detectRecordPermissionDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectRecordPermissionDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setFailOn("get");

      await expect(detectRecordPermissionDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.recordPermissionStorage.setContent(VALID_CONFIG);
      container.recordPermissionConfigurator.setFailOn("getRecordPermissions");

      await expect(detectRecordPermissionDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
