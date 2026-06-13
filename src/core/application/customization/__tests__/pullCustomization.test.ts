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
import {
  applyPulledCustomizationMerge,
  pullCustomization,
} from "../pullCustomization";

const BASE = "/app";
const CAPTURE_BASE = "/app";
const PREFIX = "";

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

const input = {
  basePath: BASE,
  captureBasePath: CAPTURE_BASE,
  filePrefix: PREFIX,
};

describe("pullCustomization", () => {
  const getContainer = setupTestCustomizationContainer();

  it("first run (no state) downloads remote files and initializes state", async () => {
    const container = getContainer();
    setRemote(container, [remoteFile("a.js")], "7");

    const result = await pullCustomization({ container, input });

    expect(result.mode).toBe("firstTime");
    // capture-equivalent path downloads + writes files and the config.
    expect(container.fileDownloader.callLog).toContain("download");
    expect(container.fileWriter.callLog).toContain("write");
    expect(container.customizationStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js"), remoteFile("b.js")], "2");

    const result = await pullCustomization({
      container,
      input: { ...input, force: true },
    });

    expect(result.mode).toBe("force");
    expect(container.fileWriter.callLog).toContain("write");
  });

  it("returns the merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js", "b.js"));
    setRemote(container, [remoteFile("a.js")], "1");

    const result = await pullCustomization({ container, input });

    expect(result.mode).toBe("merged");
    expect(container.customizationStorage.callLog).not.toContain("update");
    expect(container.customizationStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledCustomizationMerge downloads remote-only files and advances state", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    // remote added c.js (remoteOnly) → must be downloaded on apply.
    setRemote(container, [remoteFile("a.js"), remoteFile("c.js")], "2");
    matchFile(container, "a.js");

    const pull = await pullCustomization({ container, input });
    if (pull.mode !== "merged") throw new Error("expected merged");

    container.fileDownloader.resetCallLog?.();
    await applyPulledCustomizationMerge({
      container,
      input: {
        basePath: BASE,
        merge: pull.merge,
        resolution: new Map(),
        local: pull.local,
        remote: pull.remote,
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    // c.js (not present locally) is downloaded; a.js (already local) is not.
    expect(container.fileWriter.writtenFiles.has(`${BASE}/c.js`)).toBe(true);
    expect(container.fileWriter.writtenFiles.has(`${BASE}/a.js`)).toBe(false);
    expect(container.customizationStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
    // pull never touches the remote.
    expect(container.customizationConfigurator.callLog).not.toContain(
      "updateCustomization",
    );
  });

  it("resolves a same-name content conflict to the chosen side", async () => {
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

    const pull = await pullCustomization({ container, input });
    if (pull.mode !== "merged") throw new Error("expected merged");
    expect(pull.merge.hasConflict).toBe(true);

    await applyPulledCustomizationMerge({
      container,
      input: {
        basePath: BASE,
        merge: pull.merge,
        resolution: new Map([["desktop:js:a.js", "remote"]]),
        local: pull.local,
        remote: pull.remote,
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    // Resolved to remote → a.js is (re)downloaded with the remote body.
    expect(container.fileWriter.writtenFiles.has(`${BASE}/a.js`)).toBe(true);
  });
});
