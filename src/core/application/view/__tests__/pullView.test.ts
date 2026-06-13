import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestViewContainer } from "@/core/application/__tests__/helpers";
import type { TestViewContainer } from "@/core/application/__tests__/helpers/view";
import type { ViewConfig, ViewsConfig } from "@/core/domain/view/entity";
import { ViewStateSerializer } from "@/core/domain/view/services/viewStateSerializer";
import { applyPulledViewMerge, pullView } from "../pullView";

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

describe("pullView", () => {
  const getContainer = setupTestViewContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.viewConfigurator.setViews(
      { 一覧: view("一覧", { title: "remote" }) },
      "7",
    );

    const result = await pullView({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.viewStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("local"));
    container.viewConfigurator.setViews(
      { 一覧: view("一覧", { title: "remote" }) },
      "2",
    );

    const result = await pullView({ container, input: { force: true } });

    expect(result.mode).toBe("force");
  });

  it("returns the merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("local"));
    container.viewConfigurator.setViews(
      { 一覧: view("一覧", { title: "remote" }) },
      "2",
    );

    const result = await pullView({ container, input: {} });

    expect(result.mode).toBe("merged");
    // Two-stage: nothing written during the first stage (AC-11).
    expect(container.viewStorage.callLog).not.toContain("update");
    expect(container.viewStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledViewMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("local"));
    const remoteConfig: ViewsConfig = {
      views: { 一覧: view("一覧", { title: "remote" }) },
    };
    container.viewConfigurator.setViews(remoteConfig.views, "2");

    const pull = await pullView({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledViewMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: new Map([["一覧", "remote"]]),
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.viewStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
