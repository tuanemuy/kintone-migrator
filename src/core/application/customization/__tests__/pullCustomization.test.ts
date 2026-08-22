import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestCustomizationContainer } from "@/core/application/__tests__/helpers";
import type { TestCustomizationContainer } from "@/core/application/__tests__/helpers/customization";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import type { CustomizationMergeResolution } from "@/core/domain/customization/services/customizationMerge";
import { CustomizationStateParser } from "@/core/domain/customization/services/customizationStateParser";
import { CustomizationStateSerializer } from "@/core/domain/customization/services/customizationStateSerializer";
import type {
  ContentDigest,
  CustomizationFileDigests,
  CustomizationScope,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import { computeContentDigest } from "@/lib/contentDigest";
import { detectCustomizationThreeWayDiff } from "../detectCustomizationThreeWayDiff";
import { parseCustomizationConfigText } from "../parseConfig";
import {
  applyPulledCustomizationMerge,
  type PullCustomizationOutput,
  pullCustomization,
} from "../pullCustomization";
import { pushCustomization } from "../pushCustomization";

const BASE = "/app";
const CAPTURE_BASE = "/app";
const PREFIX = "";
const KEY = "desktop:js:a.js";

type MergedPull = Extract<PullCustomizationOutput, { mode: "merged" }>;

function bytes(body: string): ArrayBuffer {
  return new TextEncoder().encode(body).buffer as ArrayBuffer;
}

function digestOf(body: string): ContentDigest {
  return computeContentDigest(bytes(body));
}

function textOf(data: ArrayBuffer | undefined): string | undefined {
  return data === undefined ? undefined : new TextDecoder().decode(data);
}

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

function baseDigests(bodies: Record<string, string>): CustomizationFileDigests {
  return new Map(
    Object.entries(bodies).map(([key, body]) => [key, digestOf(body)]),
  );
}

function setState(
  container: TestCustomizationContainer,
  config: CustomizationConfig,
  revision: string,
  fileDigests: CustomizationFileDigests = new Map(),
): void {
  container.customizationStateStorage.setContent(
    configCodec.stringify(
      CustomizationStateSerializer.serialize({ config, fileDigests }),
    ),
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
  const buf = bytes(body);
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
  const buf = bytes(body);
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

async function readStateDigests(
  container: TestCustomizationContainer,
): Promise<CustomizationFileDigests> {
  const result = await container.customizationStateStorage.get();
  if (!result.exists) throw new Error("expected state");
  return CustomizationStateParser.parse(configCodec.parse(result.content))
    .fileDigests;
}

const input = {
  basePath: BASE,
  captureBasePath: CAPTURE_BASE,
  filePrefix: PREFIX,
};

async function pullMerged(
  container: TestCustomizationContainer,
  pullInput = input,
): Promise<MergedPull> {
  const result = await pullCustomization({ container, input: pullInput });
  if (result.mode !== "merged") throw new Error("expected merged");
  return result;
}

/** Applies a pulled merge, passing the first stage's output through verbatim. */
async function applyMerge(
  container: TestCustomizationContainer,
  pull: MergedPull,
  resolution: CustomizationMergeResolution = new Map(),
  basePath = BASE,
): Promise<void> {
  await applyPulledCustomizationMerge({
    container,
    input: {
      basePath,
      merge: pull.merge,
      resolution,
      local: pull.local,
      remote: pull.remote,
      remoteConfig: pull.remoteConfig,
      remoteRevision: pull.remoteRevision,
      remoteDigests: pull.remoteDigests,
    },
  });
}

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
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js", "b.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    matchFile(container, "a.js", "v1");

    const result = await pullCustomization({ container, input });

    expect(result.mode).toBe("merged");
    expect(container.customizationStorage.callLog).not.toContain("update");
    expect(container.customizationStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledCustomizationMerge downloads remote-only files and advances state", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    // remote added c.js (remoteOnly) → must be downloaded on apply.
    setRemote(container, [remoteFile("a.js"), remoteFile("c.js")], "2");
    matchFile(container, "a.js", "v1");

    const pull = await pullMerged(container);

    container.fileDownloader.resetCallLog?.();
    await applyMerge(container, pull);

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
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    container.fileContentReader.setFile(`${BASE}/a.js`, bytes("local"));
    container.fileDownloader.setFile("fk-a.js", bytes("remote"));

    const pull = await pullMerged(container);
    expect(pull.merge.hasConflict).toBe(true);

    await applyMerge(container, pull, new Map([[KEY, "remote"]]));

    // Resolved to remote → a.js is (re)downloaded with the remote body.
    expect(container.fileWriter.writtenFiles.has(`${BASE}/a.js`)).toBe(true);
  });

  it("does not prompt for a conflict when only the local body changed (AC-11)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "4");
    container.fileContentReader.setFile(`${BASE}/a.js`, bytes("v2"));
    container.fileDownloader.setFile("fk-a.js", bytes("v1"));

    const pull = await pullMerged(container);

    expect(pull.merge.hasConflict).toBe(false);
    expect(pull.merge.entries.find((e) => e.key === KEY)?.change.kind).toBe(
      "localOnly",
    );
  });

  it("keeps a locally edited file pushable after applying the merge (AC-15)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "4");
    container.fileContentReader.setFile(`${BASE}/a.js`, bytes("v2"));
    container.fileDownloader.setFile("fk-a.js", bytes("v1"));

    await applyMerge(container, await pullMerged(container));

    // The base records what the remote holds, so the local edit is still a
    // local change rather than remote drift.
    expect(await readStateDigests(container)).toEqual(
      new Map([[KEY, digestOf("v1")]]),
    );
    const diff = await detectCustomizationThreeWayDiff({
      container,
      input: { basePath: BASE },
    });
    expect(diff.mode).toBe("three-way");
    if (diff.mode === "three-way") {
      expect(diff.localChanges.map((e) => e.key)).toContain(KEY);
    }

    const push = await pushCustomization({
      container,
      input: { basePath: BASE },
    });
    expect(push.mode).toBe("push");
  });

  it("reports no differences after applying a remote-side merge (AC-12)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    container.fileContentReader.setFile(`${BASE}/a.js`, bytes("v1"));
    container.fileDownloader.setFile("fk-a.js", bytes("v2"));

    const pull = await pullMerged(container);
    expect(pull.merge.entries.find((e) => e.key === KEY)?.change.kind).toBe(
      "remoteOnly",
    );
    await applyMerge(container, pull);

    const diff = await detectCustomizationThreeWayDiff({
      container,
      input: { basePath: BASE },
    });
    expect(diff.mode).toBe("three-way");
    if (diff.mode === "three-way") {
      expect(diff.isEmpty).toBe(true);
    }
  });

  it("reports the conflicting key whose local body could not be read", async () => {
    const container = getContainer();
    // The baseline IS recorded, so the key is not a conservative estimate — the
    // conflict exists only because the local content is unknown, and the CLI has
    // to say so before asking which side to keep.
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    container.fileContentReader.setFailure(`${BASE}/a.js`);
    container.fileDownloader.setFile("fk-a.js", bytes("v2"));

    const pull = await pullMerged(container);

    expect(pull.merge.conflicts.map((c) => c.key)).toEqual([KEY]);
    expect(pull.estimatedKeys.conservative.has(KEY)).toBe(false);
    expect([...pull.unreadableLocalKeys]).toEqual([KEY]);
  });

  it("leaves unreadableLocalKeys empty when every declared body is readable", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    container.fileContentReader.setFile(`${BASE}/a.js`, bytes("local"));
    container.fileDownloader.setFile("fk-a.js", bytes("remote"));

    const pull = await pullMerged(container);

    expect(pull.merge.conflicts.map((c) => c.key)).toEqual([KEY]);
    expect([...pull.unreadableLocalKeys]).toEqual([]);
  });

  it("succeeds with the key untracked when a declared file is missing from disk (AC-10)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js", "b.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    matchFile(container, "a.js", "v1");
    // b.js is declared locally but never built.
    container.fileContentReader.setFailure(`${BASE}/b.js`);

    await applyMerge(container, await pullMerged(container));

    const digests = await readStateDigests(container);
    expect(digests.get(KEY)).toBe(digestOf("v1"));
    expect(digests.has("desktop:js:b.js")).toBe(false);
  });
});

describe("pullCustomization — snapshot digests with a file prefix (AC-6)", () => {
  const getContainer = setupTestCustomizationContainer();

  // The capture base and the content base differ, so passing the wrong one
  // would read nothing and silently record a digest-less state.
  const CAPTURE = "/proj";
  const FILE_PREFIX = "app";
  const CONTENT_BASE = "/proj/app";
  const prefixedInput = {
    basePath: CONTENT_BASE,
    captureBasePath: CAPTURE,
    filePrefix: FILE_PREFIX,
  };
  const CAPTURED_KEY = "desktop:js:a.js";

  it("records the digest of every captured file on the first run", async () => {
    const container = getContainer();
    setRemote(container, [remoteFile("a.js")], "7");
    container.fileDownloader.setFile("fk-a.js", bytes("remote-body"));

    const result = await pullCustomization({
      container,
      input: prefixedInput,
    });

    expect(result.mode).toBe("firstTime");
    expect(
      container.fileWriter.writtenFiles.has(`${CONTENT_BASE}/desktop/js/a.js`),
    ).toBe(true);
    expect(await readStateDigests(container)).toEqual(
      new Map([[CAPTURED_KEY, digestOf("remote-body")]]),
    );
  });

  it("records the digest of every captured file on a forced pull", async () => {
    const container = getContainer();
    const local = nestedFile("desktop/js/a.js");
    setState(container, local, "1");
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "2");
    container.fileDownloader.setFile("fk-a.js", bytes("forced-body"));

    const result = await pullCustomization({
      container,
      input: { ...prefixedInput, force: true },
    });

    expect(result.mode).toBe("force");
    expect(await readStateDigests(container)).toEqual(
      new Map([[CAPTURED_KEY, digestOf("forced-body")]]),
    );
  });

  it("records the remote digest for a locally-won entry of an applied merge", async () => {
    const container = getContainer();
    const local = nestedFile("desktop/js/a.js");
    setState(container, local, "1", baseDigests({ [CAPTURED_KEY]: "v1" }));
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "3");
    container.fileContentReader.setFile(
      `${CONTENT_BASE}/desktop/js/a.js`,
      bytes("v2"),
    );
    container.fileDownloader.setFile("fk-a.js", bytes("v1"));

    const pull = await pullMerged(container, prefixedInput);
    await applyMerge(container, pull, new Map(), CONTENT_BASE);

    expect(await readStateDigests(container)).toEqual(
      new Map([[CAPTURED_KEY, digestOf("v1")]]),
    );
  });
});

describe("pullCustomization — remote file name with a directory separator", () => {
  const getContainer = setupTestCustomizationContainer();

  // The remote config the merge is built from carries `file.name` as its `path`,
  // so a name like "sub/a.js" is keyed by its trailing segment. A fileKey index
  // keyed by the raw name misses that key: the body is never downloaded, yet the
  // new base records the remote digest — the disk keeps the old bytes while the
  // state claims the remote's, so the next push overwrites the remote with them.
  it("downloads the remote body under the merge identity and records it as the base", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("sub/a.js", "fk-nested")], "2");
    container.fileContentReader.setFile(`${BASE}/a.js`, bytes("v1"));
    container.fileDownloader.setFile("fk-nested", bytes("v2"));

    const pull = await pullMerged(container);
    expect(pull.merge.entries.find((e) => e.key === KEY)?.change.kind).toBe(
      "remoteOnly",
    );

    await applyMerge(container, pull);

    expect(textOf(container.fileWriter.writtenFiles.get(`${BASE}/a.js`))).toBe(
      "v2",
    );
    expect(await readStateDigests(container)).toEqual(
      new Map([[KEY, digestOf("v2")]]),
    );
    // The recorded base matches what is on disk, so nothing looks like drift.
    const diff = await detectCustomizationThreeWayDiff({
      container,
      input: { basePath: BASE },
    });
    expect(diff.mode).toBe("three-way");
    if (diff.mode === "three-way") {
      expect(diff.isEmpty).toBe(true);
    }
  });
});

describe("pullCustomization — path preservation (Issue #205)", () => {
  const getContainer = setupTestCustomizationContainer();
  const NESTED = "app/desktop/js/a.js";
  const NESTED_ABS = `${BASE}/${NESTED}`;
  const NESTED_KEY = "desktop:js:a.js";

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
    setState(container, local, "1", baseDigests({ [NESTED_KEY]: "same-body" }));
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "1");
    matchNested(container, NESTED, "fk-a.js", "same-body");

    const pull = await pullMerged(container);
    expect(pull.merge.hasConflict).toBe(false);
    await applyMerge(container, pull);

    const localAfter = await readLocal(container);
    expect(localAfter.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });

  it("conflict→remote keeps the local path and downloads the remote body to it (AC-5)", async () => {
    const container = getContainer();
    const local = nestedFile(NESTED);
    setState(container, local, "1", baseDigests({ [NESTED_KEY]: "base" }));
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "2");
    // diverging content → conflict.
    container.fileContentReader.setFile(NESTED_ABS, bytes("local"));
    container.fileDownloader.setFile("fk-a.js", bytes("remote"));

    const pull = await pullMerged(container);
    expect(pull.merge.hasConflict).toBe(true);
    await applyMerge(container, pull, new Map([[NESTED_KEY, "remote"]]));

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
    setState(container, local, "1", baseDigests({ [NESTED_KEY]: "same-body" }));
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "1");
    matchNested(container, NESTED, "fk-a.js", "same-body");

    const applyOnce = async () => {
      await applyMerge(container, await pullMerged(container));
    };

    await applyOnce();
    const firstLocal = await readLocal(container);
    await applyOnce();
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
    setState(container, local, "1", baseDigests({ [NESTED_KEY]: "body" }));
    setLocal(container, local);
    setRemote(container, [remoteFile("a.js")], "1");
    matchNested(container, NESTED, "fk-a.js", "body");

    await applyMerge(container, await pullMerged(container));

    const push = await pushCustomization({
      container,
      input: { basePath: BASE },
    });
    expect(push.mode).toBe("push");
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: NESTED });
  });
});

describe("pullCustomization — cross-bucket path preservation (Issue #205, B-001)", () => {
  const getContainer = setupTestCustomizationContainer();

  // desktop and mobile ship same-basename files (main.js / style.css) — a common
  // layout. Each bucket's declared path must survive independently; a flat
  // basename map would let one bucket's path clobber the other's (last-wins).
  const D_JS = "app/desktop/js/main.js";
  const D_CSS = "app/desktop/css/style.css";
  const M_JS = "app/mobile/js/main.js";
  const M_CSS = "app/mobile/css/style.css";

  function crossBucketLocal(): CustomizationConfig {
    return {
      scope: "ALL",
      desktop: {
        js: [{ type: "FILE", path: D_JS }],
        css: [{ type: "FILE", path: D_CSS }],
      },
      mobile: {
        js: [{ type: "FILE", path: M_JS }],
        css: [{ type: "FILE", path: M_CSS }],
      },
    };
  }

  function setCrossBucketRemote(
    container: TestCustomizationContainer,
    revision: string,
  ): void {
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: {
        js: [remoteFile("main.js", "fk-d-main")],
        css: [remoteFile("style.css", "fk-d-style")],
      },
      mobile: {
        js: [remoteFile("main.js", "fk-m-main")],
        css: [remoteFile("style.css", "fk-m-style")],
      },
      revision,
    });
    for (const key of ["fk-d-main", "fk-d-style", "fk-m-main", "fk-m-style"]) {
      container.fileDownloader.setFile(key, bytes(`body-${key}`));
    }
  }

  it("force keeps each bucket's declared path without cross-bucket collision (AC-1/2/3)", async () => {
    const container = getContainer();
    const local = crossBucketLocal();
    setState(container, local, "1");
    setLocal(container, local);
    setCrossBucketRemote(container, "2");

    const result = await pullCustomization({
      container,
      input: { ...input, force: true },
    });
    expect(result.mode).toBe("force");

    // Every bucket keeps its own declared path (not last-wins from another).
    const localAfter = await readLocal(container);
    expect(localAfter.desktop.js[0]).toEqual({ type: "FILE", path: D_JS });
    expect(localAfter.desktop.css[0]).toEqual({ type: "FILE", path: D_CSS });
    expect(localAfter.mobile.js[0]).toEqual({ type: "FILE", path: M_JS });
    expect(localAfter.mobile.css[0]).toEqual({ type: "FILE", path: M_CSS });

    // Bodies land at four distinct nested locations — no two downloads collide.
    for (const path of [D_JS, D_CSS, M_JS, M_CSS]) {
      expect(container.fileWriter.writtenFiles.has(`${BASE}/${path}`)).toBe(
        true,
      );
    }
    expect(container.fileWriter.writtenFiles.size).toBe(4);

    // State mirrors local for every bucket (base == local), each with the
    // digest of the body written to that bucket's own path.
    const state = await readState(container);
    expect(state.desktop.js[0]).toEqual({ type: "FILE", path: D_JS });
    expect(state.desktop.css[0]).toEqual({ type: "FILE", path: D_CSS });
    expect(state.mobile.js[0]).toEqual({ type: "FILE", path: M_JS });
    expect(state.mobile.css[0]).toEqual({ type: "FILE", path: M_CSS });
    expect(await readStateDigests(container)).toEqual(
      new Map([
        ["desktop:js:main.js", digestOf("body-fk-d-main")],
        ["desktop:css:style.css", digestOf("body-fk-d-style")],
        ["mobile:js:main.js", digestOf("body-fk-m-main")],
        ["mobile:css:style.css", digestOf("body-fk-m-style")],
      ]),
    );
  });
});

describe("pullCustomization — cross-bucket merge application (Issue #207, W-005)", () => {
  const getContainer = setupTestCustomizationContainer();

  // desktop and mobile both ship a `main.js`. The download set of an applied
  // merge is keyed by the bucket-qualified identity, so a remote-side change in
  // one bucket must neither re-download nor overwrite the other bucket's file
  // (a flat basename key resolves both to whichever fileKey was seen last).
  const D_JS = "desktop/js/main.js";
  const M_JS = "mobile/js/main.js";
  const D_KEY = "desktop:js:main.js";
  const M_KEY = "mobile:js:main.js";
  const D_PATH = `${BASE}/${D_JS}`;
  const M_PATH = `${BASE}/${M_JS}`;

  function twoBucketLocal(): CustomizationConfig {
    return {
      scope: "ALL",
      desktop: { js: [{ type: "FILE", path: D_JS }], css: [] },
      mobile: { js: [{ type: "FILE", path: M_JS }], css: [] },
    };
  }

  function setTwoBucketRemote(
    container: TestCustomizationContainer,
    revision: string,
    bodies: { desktop: string; mobile: string },
  ): void {
    container.customizationConfigurator.setCustomization({
      scope: "ALL",
      desktop: { js: [remoteFile("main.js", "fk-d-main")], css: [] },
      mobile: { js: [remoteFile("main.js", "fk-m-main")], css: [] },
      revision,
    });
    container.fileDownloader.setFile("fk-d-main", bytes(bodies.desktop));
    container.fileDownloader.setFile("fk-m-main", bytes(bodies.mobile));
  }

  it("downloads only the changed bucket, with that bucket's own body", async () => {
    const container = getContainer();
    const local = twoBucketLocal();
    setState(
      container,
      local,
      "1",
      baseDigests({ [D_KEY]: "d-v1", [M_KEY]: "m-v1" }),
    );
    setLocal(container, local);
    // desktop drifted remotely (remoteOnly); mobile is identical everywhere.
    setTwoBucketRemote(container, "2", { desktop: "d-v2", mobile: "m-v1" });
    container.fileContentReader.setFile(D_PATH, bytes("d-v1"));
    container.fileContentReader.setFile(M_PATH, bytes("m-v1"));

    const pull = await pullMerged(container);
    expect(pull.merge.entries.find((e) => e.key === D_KEY)?.change.kind).toBe(
      "remoteOnly",
    );
    expect(pull.merge.entries.find((e) => e.key === M_KEY)?.change.kind).toBe(
      "unchanged",
    );

    await applyMerge(container, pull);

    // The desktop body comes from the desktop fileKey, not mobile's.
    expect(textOf(container.fileWriter.writtenFiles.get(D_PATH))).toBe("d-v2");
    expect(container.fileWriter.writtenFiles.has(M_PATH)).toBe(false);
    expect(await readStateDigests(container)).toEqual(
      new Map([
        [D_KEY, digestOf("d-v2")],
        [M_KEY, digestOf("m-v1")],
      ]),
    );
  });

  it("keeps a local-only edit in the sibling bucket when a conflict resolves to remote", async () => {
    const container = getContainer();
    const local = twoBucketLocal();
    setState(
      container,
      local,
      "1",
      baseDigests({ [D_KEY]: "d-base", [M_KEY]: "m-base" }),
    );
    setLocal(container, local);
    // desktop diverged on both sides (conflict); mobile changed locally only.
    setTwoBucketRemote(container, "2", {
      desktop: "d-remote",
      mobile: "m-base",
    });
    container.fileContentReader.setFile(D_PATH, bytes("d-local"));
    container.fileContentReader.setFile(M_PATH, bytes("m-local"));

    const pull = await pullMerged(container);
    expect(pull.merge.conflicts.map((c) => c.key)).toEqual([D_KEY]);
    expect(pull.merge.entries.find((e) => e.key === M_KEY)?.change.kind).toBe(
      "localOnly",
    );

    await applyMerge(container, pull, new Map([[D_KEY, "remote"]]));

    expect(textOf(container.fileWriter.writtenFiles.get(D_PATH))).toBe(
      "d-remote",
    );
    // Resolving the desktop conflict must not overwrite the mobile edit.
    expect(container.fileWriter.writtenFiles.has(M_PATH)).toBe(false);
    expect(textOf(await container.fileContentReader.read(M_PATH))).toBe(
      "m-local",
    );
  });
});
