import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestCustomizationContainer } from "@/core/application/__tests__/helpers";
import type { TestCustomizationContainer } from "@/core/application/__tests__/helpers/customization";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import { CustomizationStateSerializer } from "@/core/domain/customization/services/customizationStateSerializer";
import type {
  ContentDigest,
  CustomizationFileDigests,
  CustomizationScope,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import { computeContentDigest } from "@/lib/contentDigest";
import type { ThreeWayDiffResult } from "../../threeWay/threeWayDiff";
import { detectCustomizationThreeWayDiff } from "../detectCustomizationThreeWayDiff";

const BASE = "/app";
const KEY = "desktop:js:a.js";

function bytes(body: string): ArrayBuffer {
  return new TextEncoder().encode(body).buffer as ArrayBuffer;
}

function digestOf(body: string): ContentDigest {
  return computeContentDigest(bytes(body));
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

function setLocalBody(
  container: TestCustomizationContainer,
  name: string,
  body: string,
): void {
  container.fileContentReader.setFile(`${BASE}/${name}`, bytes(body));
}

function setRemoteBody(
  container: TestCustomizationContainer,
  name: string,
  body: string,
): void {
  container.fileDownloader.setFile(`fk-${name}`, bytes(body));
}

function matchFile(
  container: TestCustomizationContainer,
  name: string,
  body = `same-${name}`,
): void {
  setLocalBody(container, name, body);
  setRemoteBody(container, name, body);
}

function threeWay(
  result: ThreeWayDiffResult<unknown>,
): Extract<ThreeWayDiffResult<unknown>, { mode: "three-way" }> {
  if (result.mode !== "three-way") throw new Error("expected a 3-way diff");
  return result;
}

async function runDiff(container: TestCustomizationContainer) {
  return threeWay(
    await detectCustomizationThreeWayDiff({
      container,
      input: { basePath: BASE },
    }),
  );
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
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ [KEY]: "same-a.js" }),
    );
    setLocal(container, localFile("a.js", "b.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    matchFile(container, "a.js");

    const result = await runDiff(container);

    expect(result.localChanges.map((e) => e.key)).toContain("desktop:js:b.js");
    expect(result.conflicts).toHaveLength(0);
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js"), remoteFile("c.js")], "2");
    matchFile(container, "a.js", "v1");

    const result = await runDiff(container);

    expect(result.remoteDrift.map((e) => e.key)).toContain("desktop:js:c.js");
  });

  it("classifies a locally edited file as a local change, not a conflict (AC-1)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "4");
    setLocalBody(container, "a.js", "v2");
    setRemoteBody(container, "a.js", "v1");

    const result = await runDiff(container);

    expect(result.localChanges.map((e) => e.key)).toContain(KEY);
    expect(result.conflicts).toHaveLength(0);
    expect(result.notes).toBeUndefined();
  });

  it("classifies a remotely edited file as remote drift (AC-3)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "4");
    setLocalBody(container, "a.js", "v1");
    setRemoteBody(container, "a.js", "edited-on-kintone");

    const result = await runDiff(container);

    expect(result.remoteDrift.map((e) => e.key)).toContain(KEY);
    expect(result.conflicts).toHaveLength(0);
  });

  it("classifies a same-name content conflict (both sides changed, AC-4)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    setLocalBody(container, "a.js", "local");
    setRemoteBody(container, "a.js", "remote");

    const result = await runDiff(container);

    expect(result.conflicts.map((e) => e.key)).toContain(KEY);
  });

  it("reports no difference when both sides changed identically (AC-5)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    matchFile(container, "a.js", "v2");

    const result = await runDiff(container);

    expect(result.isEmpty).toBe(true);
  });

  it("treats an unreadable local file as untracked instead of failing (AC-10)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1", baseDigests({ [KEY]: "v1" }));
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    setRemoteBody(container, "a.js", "v1");
    container.fileContentReader.setFailure(`${BASE}/a.js`);

    const result = await runDiff(container);

    // base == remote, and the local content is unknown → a local change.
    expect(result.localChanges.map((e) => e.key)).toContain(KEY);
  });
});

describe("detectCustomizationThreeWayDiff — snapshots without digests", () => {
  const getContainer = setupTestCustomizationContainer();

  it("classifies a local edit as a local change when the revision is unchanged (AC-7)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    setLocalBody(container, "a.js", "edited-locally");
    setRemoteBody(container, "a.js", "original");

    const result = await runDiff(container);

    expect(result.localChanges.map((e) => e.key)).toContain(KEY);
    expect(result.conflicts).toHaveLength(0);
  });

  it("notes the optimistic assumption without prescribing --force (AC-9 a)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    setLocalBody(container, "a.js", "edited-locally");
    setRemoteBody(container, "a.js", "original");

    const result = await runDiff(container);
    const notes = (result.notes ?? []).join("\n");

    expect(notes).toContain("assuming the remote still matches the base");
    expect(notes).toContain("non-force");
    expect(notes).toContain("If the remote may have been edited outside");
    expect(notes).not.toContain("classification is inferred");
  });

  it("notes the inferred classification and points at a plain pull (AC-9 b)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    setLocalBody(container, "a.js", "local");
    setRemoteBody(container, "a.js", "remote");

    const result = await runDiff(container);
    const notes = (result.notes ?? []).join("\n");

    expect(result.conflicts.map((e) => e.key)).toContain(KEY);
    expect(notes).toContain("classification is inferred");
    expect(notes).toContain("Run `customize pull` once");
    expect(notes).not.toContain("--force");
  });

  it("stays silent when the inferred keys produced no diff line (AC-9 c)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    matchFile(container, "a.js", "same-body");

    const result = await runDiff(container);

    expect(result.isEmpty).toBe(true);
    expect(result.notes).toBeUndefined();
  });

  it("reports no difference when both sides match at a moved revision (AC-8 a)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    matchFile(container, "a.js", "same-body");

    expect((await runDiff(container)).isEmpty).toBe(true);
  });

  it("reports remote drift when the file was removed on the remote (AC-8 c)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [], "2");
    setLocalBody(container, "a.js", "local");

    expect((await runDiff(container)).remoteDrift.map((e) => e.key)).toContain(
      KEY,
    );
  });

  it("reports a local change when the declaration was removed locally (AC-8 d)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, emptyConfig());
    setRemote(container, [remoteFile("a.js")], "2");
    setRemoteBody(container, "a.js", "remote");

    expect((await runDiff(container)).localChanges.map((e) => e.key)).toContain(
      KEY,
    );
  });

  it("reports nothing when the file was removed on both sides (AC-8 e)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, emptyConfig());
    setRemote(container, [], "2");

    expect((await runDiff(container)).isEmpty).toBe(true);
  });
});

function emptyConfig(): CustomizationConfig {
  return {
    scope: "ALL",
    desktop: { js: [], css: [] },
    mobile: { js: [], css: [] },
  };
}
