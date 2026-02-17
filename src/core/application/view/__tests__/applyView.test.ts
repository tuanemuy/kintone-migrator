import { describe, expect, it } from "vitest";
import { setupTestViewContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyView } from "../applyView";

const VALID_CONFIG = `
views:
  一覧:
    type: LIST
    index: 0
    fields:
      - field1
      - field2
`;

const CONFIG_WITH_BUILTIN = `
views:
  一覧:
    type: LIST
    index: 0
    fields:
      - field1
  assignee:
    type: LIST
    index: 1
    builtinType: ASSIGNEE
  custom:
    type: CUSTOM
    index: 2
    html: "<div>test</div>"
`;

describe("applyView", () => {
  const getContainer = setupTestViewContainer();

  describe("success cases", () => {
    it("should read config and update views", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);

      await applyView({ container });

      expect(container.viewConfigurator.callLog).toEqual([
        "getViews",
        "updateViews",
      ]);
      expect(container.viewConfigurator.lastUpdateParams?.views).toHaveProperty(
        "一覧",
      );
    });

    it("should pass revision from current views", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      container.viewConfigurator.setViews({}, "42");

      await applyView({ container });

      expect(container.viewConfigurator.lastUpdateParams?.revision).toBe("42");
    });

    it("should skip builtin views and return their names", async () => {
      const container = getContainer();
      container.viewStorage.setContent(CONFIG_WITH_BUILTIN);

      const result = await applyView({ container });

      expect(result.skippedBuiltinViews).toEqual(["assignee"]);
      expect(
        container.viewConfigurator.lastUpdateParams?.views,
      ).not.toHaveProperty("assignee");
      expect(container.viewConfigurator.lastUpdateParams?.views).toHaveProperty(
        "一覧",
      );
      expect(container.viewConfigurator.lastUpdateParams?.views).toHaveProperty(
        "custom",
      );
    });

    it("should merge remote builtinType views into update request", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      container.viewConfigurator.setViews({
        "(Assigned to me)": {
          type: "LIST",
          index: 3,
          name: "(Assigned to me)",
          builtinType: "ASSIGNEE",
        },
      });

      const result = await applyView({ container });

      expect(result.skippedBuiltinViews).toEqual([]);
      expect(container.viewConfigurator.lastUpdateParams?.views).toHaveProperty(
        "一覧",
      );
      expect(container.viewConfigurator.lastUpdateParams?.views).toHaveProperty(
        "(Assigned to me)",
      );
      const builtinView =
        container.viewConfigurator.lastUpdateParams?.views["(Assigned to me)"];
      expect(builtinView?.builtinType).toBe("ASSIGNEE");
    });

    it("should not overwrite local non-builtin views with remote builtinType views of same name", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      // Simulate an unlikely scenario where remote has a builtinType view
      // with the same name as a local non-builtin view
      container.viewConfigurator.setViews({
        一覧: {
          type: "LIST",
          index: 0,
          name: "一覧",
          builtinType: "ASSIGNEE",
        },
      });

      await applyView({ container });

      const updatedView =
        container.viewConfigurator.lastUpdateParams?.views["一覧"];
      // Local config should win since it's already in filteredViews
      expect(updatedView?.builtinType).toBeUndefined();
    });

    it("should return empty skippedBuiltinViews when no builtin views", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);

      const result = await applyView({ container });

      expect(result.skippedBuiltinViews).toEqual([]);
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(applyView({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.viewStorage.setContent("{ invalid: yaml:");

      await expect(applyView({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when viewStorage.get() fails", async () => {
      const container = getContainer();
      container.viewStorage.setFailOn("get");

      await expect(applyView({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when getViews() fails", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      container.viewConfigurator.setFailOn("getViews");

      await expect(applyView({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when updateViews() fails", async () => {
      const container = getContainer();
      container.viewStorage.setContent(VALID_CONFIG);
      container.viewConfigurator.setFailOn("updateViews");

      await expect(applyView({ container })).rejects.toSatisfy(isSystemError);
    });
  });
});
