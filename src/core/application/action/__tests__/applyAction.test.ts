import { describe, expect, it } from "vitest";
import { setupTestActionContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyAction } from "../applyAction";

const VALID_CONFIG = `
actions:
  見積書を作成:
    index: 0
    destApp:
      code: estimate-app
    mappings:
      - srcType: FIELD
        srcField: 顧客名
        destField: 顧客名
      - srcType: RECORD_URL
        destField: 元レコード
    entities:
      - type: GROUP
        code: everyone
    filterCond: ""
`;

describe("applyAction", () => {
  const getContainer = setupTestActionContainer();

  describe("success cases", () => {
    it("should read config and update actions", async () => {
      const container = getContainer();
      container.actionStorage.setContent(VALID_CONFIG);

      await applyAction({ container });

      expect(container.actionConfigurator.callLog).toEqual([
        "getActions",
        "updateActions",
      ]);
      expect(
        Object.keys(
          container.actionConfigurator.lastUpdateParams?.actions ?? {},
        ),
      ).toHaveLength(1);
      expect(
        container.actionConfigurator.lastUpdateParams?.actions["見積書を作成"]
          .name,
      ).toBe("見積書を作成");
      expect(container.actionConfigurator.lastUpdateParams?.revision).toBe("1");
    });

    it("should pass revision from current actions", async () => {
      const container = getContainer();
      container.actionStorage.setContent(VALID_CONFIG);
      container.actionConfigurator.setActions({}, "42");

      await applyAction({ container });

      expect(container.actionConfigurator.lastUpdateParams?.revision).toBe(
        "42",
      );
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(applyAction({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for empty config", async () => {
      const container = getContainer();
      container.actionStorage.setContent("");

      await expect(applyAction({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.actionStorage.setContent("{ invalid: yaml:");

      await expect(applyAction({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when actionStorage.get() fails", async () => {
      const container = getContainer();
      container.actionStorage.setFailOn("get");

      await expect(applyAction({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when getActions() fails", async () => {
      const container = getContainer();
      container.actionStorage.setContent(VALID_CONFIG);
      container.actionConfigurator.setFailOn("getActions");

      await expect(applyAction({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when updateActions() fails", async () => {
      const container = getContainer();
      container.actionStorage.setContent(VALID_CONFIG);
      container.actionConfigurator.setFailOn("updateActions");

      await expect(applyAction({ container })).rejects.toSatisfy(isSystemError);
    });
  });
});
