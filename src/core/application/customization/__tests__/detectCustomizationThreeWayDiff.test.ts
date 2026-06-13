import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestCustomizationContainer } from "@/core/application/__tests__/helpers";
import type { TestCustomizationContainer } from "@/core/application/__tests__/helpers/customization";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import { CustomizationStateSerializer } from "@/core/domain/customization/services/customizationStateSerializer";
import type {
  CustomizationScope,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import { detectCustomizationThreeWayDiff } from "../detectCustomizationThreeWayDiff";

const BASE = "/app";

function localFile(...names: string[]): CustomizationConfig {
  return {
    scope: "ALL",
    desktop: { js: names.map((n) => ({ type: "FILE", path: n })), css: [] },
    mobile: { js: [], css: [] },
  };
}

function remoteFile(name: string, fileKey = `fk-${name}`): RemoteResource {
  return {
    type: "FILE",
    file: { fileKey, name, contentType: "text/javascript", size: "1" },
  };
}

function setRemote(
  container: TestCustomizationContainer,
  js: RemoteResource[],
  revision: string,
  scope: CustomizationScope = "ALL",
): void {
  container.customizationConfigurator.setCustomization({
    scope,
    desktop: { js, css: [] },
    mobile: { js: [], css: [] },
    revision,
  });
}

function setState(
  container: TestCustomizationContainer,
  config: CustomizationConfig,
  revision: string,
): void {
  container.customizationStateStorage.setContent(
    configCodec.stringify(CustomizationStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

function setLocal(
  container: TestCustomizationContainer,
  config: CustomizationConfig,
): void {
  container.customizationStorage.setContent(
    configCodec.stringify(CustomizationConfigSerializer.serialize(config)),
  );
}

function matchFile(
  container: TestCustomizationContainer,
  name: string,
  body = `same-${name}`,
): void {
  const buf = new TextEncoder().encode(body).buffer;
  container.fileContentReader.setFile(`${BASE}/${name}`, buf);
  container.fileDownloader.setFile(`fk-${name}`, buf);
}

describe("detectCustomizationThreeWayDiff", () => {
  const getContainer = setupTestCustomizationContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");

    const result = await detectCustomizationThreeWayDiff({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only add", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js", "b.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    matchFile(container, "a.js");

    const result = await detectCustomizationThreeWayDiff({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toContain(
        "desktop:js:b.js",
      );
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js"), remoteFile("c.js")], "2");

    const result = await detectCustomizationThreeWayDiff({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toContain("desktop:js:c.js");
    }
  });

  it("classifies a same-name content conflict (both sides changed)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    container.fileContentReader.setFile(
      `${BASE}/a.js`,
      new TextEncoder().encode("local").buffer,
    );
    container.fileDownloader.setFile(
      "fk-a.js",
      new TextEncoder().encode("remote").buffer,
    );

    const result = await detectCustomizationThreeWayDiff({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toContain("desktop:js:a.js");
    }
  });
});
