import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestViewContainer } from "@/core/application/__tests__/helpers";
import type { TestViewContainer } from "@/core/application/__tests__/helpers/view";
import { getCurrentRemoteRevision } from "@/core/application/threeWay/remoteRevision";
import type { ViewConfig, ViewsConfig } from "@/core/domain/view/entity";
import { ViewStateSerializer } from "@/core/domain/view/services/viewStateSerializer";
import { detectViewThreeWayDiff } from "../detectViewThreeWayDiff";

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

describe("detectViewThreeWayDiff", () => {
  const getContainer = setupTestViewContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.viewStorage.setContent(viewYaml("local"));
    container.viewConfigurator.setViews(baseConfig.views, "1");

    const result = await detectViewThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("local"));
    container.viewConfigurator.setViews(baseConfig.views, "1");

    const result = await detectViewThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toContain("一覧");
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("base"));
    container.viewConfigurator.setViews(
      { 一覧: view("一覧", { title: "remote" }) },
      "2",
    );

    const result = await detectViewThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toContain("一覧");
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.viewStorage.setContent(viewYaml("local"));
    container.viewConfigurator.setViews(
      { 一覧: view("一覧", { title: "remote" }) },
      "2",
    );

    const result = await detectViewThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toContain("一覧");
    }
  });
});

describe("AppRevisionReader smoke test via view container (ADR-188-007)", () => {
  const getContainer = setupTestViewContainer();

  it("reads the current remote revision through the view container", async () => {
    const container = getContainer();
    container.appRevisionReader.setRevision("42");

    const revision = await getCurrentRemoteRevision(container);

    expect(revision).toBe("42");
    expect(container.appRevisionReader.callLog).toEqual(["getCurrent"]);
  });
});
