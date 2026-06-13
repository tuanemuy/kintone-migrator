import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestViewContainer } from "@/core/application/__tests__/helpers";
import type { TestViewContainer } from "@/core/application/__tests__/helpers/view";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type { ViewConfig, ViewsConfig } from "@/core/domain/view/entity";
import { ViewStateSerializer } from "@/core/domain/view/services/viewStateSerializer";
import { pushView } from "../pushView";

function view(name: string, overrides: Partial<ViewConfig> = {}): ViewConfig {
  return { type: "LIST", index: 0, name, ...overrides };
}

function viewYaml(title: string): string {
  return `views:\n  一覧:\n    type: LIST\n    index: 0\n    title: ${title}\n`;
}

function setState(
  container: TestViewContainer,
  config: ViewsConfig,
  revision: string,
): void {
  container.viewStateStorage.setContent(
    configCodec.stringify(ViewStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

const baseConfig: ViewsConfig = {
  views: { 一覧: view("一覧", { title: "base" }) },
};

describe("pushView", () => {
  const getContainer = setupTestViewContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.viewConfigurator.setViews(baseConfig.views, "1");

    await expect(pushView({ container, input: {} })).rejects.toSatisfy(
      isValidationError,
    );
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("local"));
    container.viewConfigurator.setViews(baseConfig.views, "1");

    const result = await pushView({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(container.viewConfigurator.lastUpdateParams?.revision).toBe("1");
    // State advanced to the post-apply revision (snapshot + revision).
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("local"));
    // remote changed the same view differently → drift.
    container.viewConfigurator.setViews(
      { 一覧: view("一覧", { title: "remote" }) },
      "2",
    );

    await expect(pushView({ container, input: {} })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    // The drift was caught before any mutation.
    expect(container.viewConfigurator.callLog).not.toContain("updateViews");
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("local"));
    container.viewConfigurator.setViews(
      { 一覧: view("一覧", { title: "remote" }) },
      "2",
    );

    const result = await pushView({ container, input: { force: true } });

    expect(result.mode).toBe("push");
    expect(
      container.viewConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.viewStorage.setContent(viewYaml("local"));
    container.viewConfigurator.setViews(baseConfig.views, "5");

    const result = await pushView({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.viewConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.viewStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
