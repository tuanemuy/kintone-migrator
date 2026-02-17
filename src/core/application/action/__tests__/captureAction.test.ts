import { describe, expect, it } from "vitest";
import { setupTestActionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureAction } from "../captureAction";

describe("captureAction", () => {
  const getContainer = setupTestActionContainer();

  describe("success cases", () => {
    it("should capture actions and serialize to YAML", async () => {
      const container = getContainer();
      container.actionConfigurator.setActions({
        見積書を作成: {
          index: 0,
          name: "見積書を作成",
          destApp: { code: "estimate-app" },
          mappings: [
            { srcType: "FIELD", srcField: "顧客名", destField: "顧客名" },
          ],
          entities: [{ type: "GROUP", code: "everyone" }],
          filterCond: "",
        },
      });

      const result = await captureAction({ container });

      expect(result.configText).toContain("見積書を作成");
      expect(result.configText).toContain("estimate-app");
      expect(result.configText).toContain("FIELD");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.actionConfigurator.setActions({});
      container.actionStorage.setContent("existing content");

      const result = await captureAction({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.actionConfigurator.setActions({});

      const result = await captureAction({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getActions() fails", async () => {
      const container = getContainer();
      container.actionConfigurator.setFailOn("getActions");

      await expect(captureAction({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when actionStorage.get() fails", async () => {
      const container = getContainer();
      container.actionConfigurator.setActions({});
      container.actionStorage.setFailOn("get");

      await expect(captureAction({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
