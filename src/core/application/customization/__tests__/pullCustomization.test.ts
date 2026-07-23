import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestCustomizationContainer } from "@/core/application/__tests__/helpers";
import type { TestCustomizationContainer } from "@/core/application/__tests__/helpers/customization";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import { CustomizationStateParser } from "@/core/domain/customization/services/customizationStateParser";
import { CustomizationStateSerializer } from "@/core/domain/customization/services/customizationStateSerializer";
import type {
  CustomizationScope,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import { parseCustomizationConfigText } from "../parseConfig";
import {
  applyPulledCustomizationMerge,
  pullCustomization,
} from "../pullCustomization";
import { pushCustomization } from "../pushCustomization";

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

/** A config with a single desktop.js FILE at the given (possibly nested) path. */
function nestedFile(path: string): CustomizationConfig {
  return {
    scope: "ALL",
    desktop: { js: [{ type: "FILE", path }], css: [] },
    mobile: { js: [], css: [] },
  };
}

/** Sets the local body and remote body for a nested FILE to identical bytes. */
function matchNested(
  container: TestCustomizationContainer,
  path: string,
  fileKey: string,
  body: string,
): void {
  const buf = new TextEncoder().encode(body).buffer;
  container.fileContentReader.setFile(`${BASE}/${path}`, buf);
  container.fileDownloader.setFile(fileKey, buf);
}

async function readLocal(
  container: TestCustomizationContainer,
): Promise<CustomizationConfig> {
  const result = await container.customizationStorage.get();
  if (!result.exists) throw new Error("expected local config");
  return parseCustomizationConfigText(configCodec, result.content);
}

async function readState(
  container: TestCustomizationContainer,
): Promise<CustomizationConfig> {
  const result = await container.customizationStateStorage.get();
  if (!result.exists) throw new Error("expected state");
  return CustomizationStateParser.parse(configCodec.parse(result.content))
    .config;
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

describe("pullCustomization — path preservation (Issue #205)", () => {
  const getContainer = setupTestCustomizationContainer();
  const NESTED = "app/desktop/js/a.js";
  const NESTED_ABS = `${BASE}/${NESTED}`;

  it("force keeps the local declared path, downloads to it, and saves state with it (AC-1/2/3)", async () => {
    const container = getContainer();
    const local = nestedFile(NESTED);
    setState(container, local, "1");
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "2");

    const result = await pullCustomization({
      container,
      input: { ...input, force: true },
    });
    expect(result.mode).toBe("force");

    // Local config path is unchanged (not stripped to basename).
    const localAfter = await readLocal(container);
    expect(localAfter.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
    // Body downloaded to the nested (double-nest) location, not basename root.
    expect(container.fileWriter.writtenFiles.has(NESTED_ABS)).toBe(true);
    expect(container.fileWriter.writtenFiles.has(`${BASE}/a.js`)).toBe(false);
    // State path matches local (base == local).
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });

  it("recovers path from local when state is missing (AC-9)", async () => {
    const container = getContainer();
    const local = nestedFile(NESTED);
    // No state; local exists → firstTime branch with path preservation.
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "5");

    const result = await pullCustomization({ container, input });
    expect(result.mode).toBe("firstTime");

    const localAfter = await readLocal(container);
    expect(localAfter.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
    expect(container.fileWriter.writtenFiles.has(NESTED_ABS)).toBe(true);
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });

  it("merge keeps the local path for an unchanged entry and sets state == local (AC-4)", async () => {
    const container = getContainer();
    const local = nestedFile(NESTED);
    setState(container, local, "1");
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "1");
    matchNested(container, NESTED, "fk-a.js", "same-body");

    const pull = await pullCustomization({ container, input });
    if (pull.mode !== "merged") throw new Error("expected merged");
    expect(pull.merge.hasConflict).toBe(false);

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

    const localAfter = await readLocal(container);
    expect(localAfter.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });

  it("conflict→remote keeps the local path and downloads the remote body to it (AC-5)", async () => {
    const container = getContainer();
    const local = nestedFile(NESTED);
    setState(container, local, "1");
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "2");
    // diverging content → conflict.
    container.fileContentReader.setFile(
      NESTED_ABS,
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

    // Remote body written to the local declared path (not basename root).
    expect(container.fileWriter.writtenFiles.has(NESTED_ABS)).toBe(true);
    expect(container.fileWriter.writtenFiles.has(`${BASE}/a.js`)).toBe(false);
    const localAfter = await readLocal(container);
    expect(localAfter.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });

  it("is idempotent across pull → pull for the merge path (AC-7)", async () => {
    const container = getContainer();
    const local = nestedFile(NESTED);
    setState(container, local, "1");
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "1");
    matchNested(container, NESTED, "fk-a.js", "same-body");

    const applyMerge = async () => {
      const pull = await pullCustomization({ container, input });
      if (pull.mode !== "merged") throw new Error("expected merged");
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
    };

    await applyMerge();
    const firstLocal = await readLocal(container);
    await applyMerge();
    const secondLocal = await readLocal(container);

    expect(secondLocal.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
    expect(secondLocal).toEqual(firstLocal);
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });

  it("pull --force then push detects no drift and only advances revision (AC-6)", async () => {
    const container = getContainer();
    const local = nestedFile(NESTED);
    setState(container, local, "1");
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "2");
    matchNested(container, NESTED, "fk-a.js", "body");

    await pullCustomization({ container, input: { ...input, force: true } });

    // Feed the post-pull state/local into the real push drift-detection path.
    const push = await pushCustomization({
      container,
      input: { basePath: BASE },
    });
    // No drift thrown → mode "push"; revision advances 2 → 3.
    expect(push.mode).toBe("push");
    expect(push.revision).toBe("3");
    // Path stays intact through the round trip.
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
    const localAfter = await readLocal(container);
    expect(localAfter.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });

  it("pull (merge) then push detects no drift (AC-6)", async () => {
    const container = getContainer();
    const local = nestedFile(NESTED);
    setState(container, local, "1");
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "1");
    matchNested(container, NESTED, "fk-a.js", "body");

    const pull = await pullCustomization({ container, input });
    if (pull.mode !== "merged") throw new Error("expected merged");
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

    const push = await pushCustomization({
      container,
      input: { basePath: BASE },
    });
    expect(push.mode).toBe("push");
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });
});
