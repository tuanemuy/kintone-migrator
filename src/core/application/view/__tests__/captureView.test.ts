import { describe, expect, it } from "vitest";
import { setupTestViewContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureView } from "../captureView";

describe("captureView", () => {
  const getContainer = setupTestViewContainer();

  describe("success cases", () => {
    it("should capture views and serialize to YAML", async () => {
      const container = getContainer();
      container.viewConfigurator.setViews({
        一覧: {
          type: "LIST",
          index: 0,
          name: "一覧",
          fields: ["field1"],
        },
      });

      const result = await captureView({ container });

      expect(result.configText).toContain("一覧");
      expect(result.configText).toContain("LIST");
      expect(result.configText).toContain("field1");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.viewConfigurator.setViews({});
      container.viewStorage.setContent("existing content");

      const result = await captureView({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.viewConfigurator.setViews({});

      const result = await captureView({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getViews() fails", async () => {
      const container = getContainer();
      container.viewConfigurator.setFailOn("getViews");

      await expect(captureView({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when viewStorage.get() fails", async () => {
      const container = getContainer();
      container.viewConfigurator.setViews({});
      container.viewStorage.setFailOn("get");

      await expect(captureView({ container })).rejects.toSatisfy(isSystemError);
    });
  });
});
