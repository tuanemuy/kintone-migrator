import { describe, expect, it } from "vitest";
import { setupTestViewContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { saveView } from "../saveView";

describe("saveView", () => {
  const getContainer = setupTestViewContainer();

  describe("success cases", () => {
    it("should save config text to storage", async () => {
      const container = getContainer();

      await saveView({
        container,
        input: { configText: "views:\n  test:\n    type: LIST\n" },
      });

      expect(container.viewStorage.callLog).toContain("update");
    });

    it("should overwrite existing content", async () => {
      const container = getContainer();
      container.viewStorage.setContent("old content");

      await saveView({
        container,
        input: { configText: "new content" },
      });

      const result = await container.viewStorage.get();
      expect(result).toMatchObject({ content: "new content" });
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when storage update fails", async () => {
      const container = getContainer();
      container.viewStorage.setFailOn("update");

      await expect(
        saveView({
          container,
          input: { configText: "content" },
        }),
      ).rejects.toSatisfy(isSystemError);
    });
  });
});
