import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestCustomizationContainer } from "@/core/application/__tests__/helpers";
import type { TestCustomizationContainer } from "@/core/application/__tests__/helpers/customization";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
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
import { pushCustomization } from "../pushCustomization";

const BASE = "/app";

function bytes(body: string): ArrayBuffer {
  return new TextEncoder().encode(body).buffer as ArrayBuffer;
}

function digestOf(body: string): ContentDigest {
  return computeContentDigest(bytes(body));
}

function localFile(name: string): CustomizationConfig {
  return {
    scope: "ALL",
    desktop: { js: [{ type: "FILE", path: name }], css: [] },
    mobile: { js: [], css: [] },
  };
}

function remoteFile(name: string, fileKey = `fk-${name}`): RemoteResource {
  return {
    type: "FILE",
    file: { fileKey, name, contentType: "text/javascript", size: "1" },
  };
}

function remotePlatform(js: RemoteResource[] = []) {
  return { js, css: [] };
}

function setRemote(
  container: TestCustomizationContainer,
  js: RemoteResource[],
  revision: string,
  scope: CustomizationScope = "ALL",
): void {
  container.customizationConfigurator.setCustomization({
    scope,
    desktop: remotePlatform(js),
    mobile: remotePlatform(),
    revision,
  });
}

/** Digest map for a state snapshot, built from the bodies the base recorded. */
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

/** Makes a shared file's local and remote content identical (no content drift). */
function matchFile(
  container: TestCustomizationContainer,
  name: string,
  body = `same-${name}`,
): void {
  setLocalBody(container, name, body);
  setRemoteBody(container, name, body);
}

async function readStateDigests(
  container: TestCustomizationContainer,
): Promise<CustomizationFileDigests> {
  const result = await container.customizationStateStorage.get();
  if (!result.exists) throw new Error("expected state");
  return CustomizationStateParser.parse(configCodec.parse(result.content))
    .fileDigests;
}

describe("pushCustomization", () => {
  const getContainer = setupTestCustomizationContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    setRemote(container, [remoteFile("a.js")], "1");

    await expect(
      pushCustomization({ container, input: { basePath: BASE } }),
    ).rejects.toSatisfy(isValidationError);
  });

  it("replaces the full lists and sends the observed revision (no drift)", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "same-a.js" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    matchFile(container, "a.js");

    const result = await pushCustomization({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("push");
    const params = container.customizationConfigurator.lastUpdateParams;
    expect(params?.revision).toBe("1");
    expect(
      params?.desktop?.js?.map((r) => (r.type === "FILE" ? r.name : "")),
    ).toEqual(["a.js"]);
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("pushes a locally edited file without --force and keeps the revision guard (AC-2)", async () => {
    const container = getContainer();
    // base == remote content; only the local body moved on.
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "3");
    setLocalBody(container, "a.js", "v2");
    setRemoteBody(container, "a.js", "v1");

    const result = await pushCustomization({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("push");
    expect(container.customizationConfigurator.lastUpdateParams?.revision).toBe(
      "3",
    );
  });

  it("rejects with a ConfigDrift ConflictError when the remote body changed (AC-3)", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "3");
    setLocalBody(container, "a.js", "v1");
    setRemoteBody(container, "a.js", "edited-on-kintone");

    await expect(
      pushCustomization({ container, input: { basePath: BASE } }),
    ).rejects.toSatisfy(isConfigDrift);
    expect(container.customizationConfigurator.callLog).not.toContain(
      "updateCustomization",
    );
  });

  it("rejects with a ConfigDrift ConflictError when the remote added a file", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    // remote drifted: added b.js relative to base.
    setRemote(container, [remoteFile("a.js"), remoteFile("b.js")], "2");
    matchFile(container, "a.js", "v1");

    await expect(
      pushCustomization({ container, input: { basePath: BASE } }),
    ).rejects.toSatisfy(isConfigDrift);
    expect(container.customizationConfigurator.callLog).not.toContain(
      "updateCustomization",
    );
  });

  it("rejects when a same-name file content diverges on both sides (conflict, AC-4)", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    setLocalBody(container, "a.js", "local-body");
    setRemoteBody(container, "a.js", "remote-body");

    await expect(
      pushCustomization({ container, input: { basePath: BASE } }),
    ).rejects.toSatisfy(isConfigDrift);
  });

  it("rejects when the remote body of a locally dropped declaration moved away from base", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, {
      scope: "ALL",
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
    });
    setRemote(container, [remoteFile("a.js")], "2");
    setRemoteBody(container, "a.js", "edited-on-kintone");

    // Pushing the dropped declaration would delete the remote edit, so with a
    // recorded baseline the remote change counts as real drift.
    await expect(
      pushCustomization({ container, input: { basePath: BASE } }),
    ).rejects.toSatisfy(isConfigDrift);
    expect(container.customizationConfigurator.callLog).not.toContain(
      "updateCustomization",
    );
  });

  it("pushes when both sides changed to the same content (AC-5)", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    matchFile(container, "a.js", "v2");

    const result = await pushCustomization({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("push");
  });

  it("records the digest of the on-disk content in the new base (AC-6)", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    setLocalBody(container, "a.js", "pushed-body");
    setRemoteBody(container, "a.js", "v1");

    await pushCustomization({ container, input: { basePath: BASE } });

    expect(await readStateDigests(container)).toEqual(
      new Map([["desktop:js:a.js", digestOf("pushed-body")]]),
    );
  });

  it("records digests on the first run too (AC-6)", async () => {
    const container = getContainer();
    setLocal(container, localFile("a.js"));
    setRemote(container, [], "5");
    setLocalBody(container, "a.js", "initial-body");

    const result = await pushCustomization({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("firstTime");
    expect(await readStateDigests(container)).toEqual(
      new Map([["desktop:js:a.js", digestOf("initial-body")]]),
    );
  });

  it("digests an absolutely declared path from where the upload reads it (AC-6)", async () => {
    const container = getContainer();
    const declared = "/vendor/app.js";
    setLocal(container, localFile(declared));
    setRemote(container, [], "5");
    // Seeded only at the declared path itself. `join(BASE, declared)` would name
    // `/app/vendor/app.js`, which is unreadable, so the key would silently lose
    // its digest while the upload still sent `/vendor/app.js`.
    container.fileContentReader.setFile(declared, bytes("vendor-body"));

    await pushCustomization({ container, input: { basePath: BASE } });

    expect(container.fileUploader.uploadedFiles.has(declared)).toBe(true);
    expect(await readStateDigests(container)).toEqual(
      new Map([["desktop:js:app.js", digestOf("vendor-body")]]),
    );
  });

  it("leaves an unreadable file untracked instead of failing (AC-10)", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    setRemoteBody(container, "a.js", "v1");
    // The declared build artifact is missing from disk.
    container.fileContentReader.setFailure(`${BASE}/a.js`);

    const result = await pushCustomization({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("push");
    expect((await readStateDigests(container)).size).toBe(0);
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js"), remoteFile("b.js")], "2");

    const result = await pushCustomization({
      container,
      input: { basePath: BASE, force: true },
    });

    expect(result.mode).toBe("push");
    expect(
      container.customizationConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    setLocal(container, localFile("a.js"));
    setRemote(container, [], "5");

    const result = await pushCustomization({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("firstTime");
    expect(
      container.customizationConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.customizationStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});

describe("pushCustomization — snapshots without digests", () => {
  const getContainer = setupTestCustomizationContainer();

  it("pushes a locally edited file when the app revision has not moved (AC-7)", async () => {
    const container = getContainer();
    // Legacy state: no digests recorded, revision still matches the remote.
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    setLocalBody(container, "a.js", "edited-locally");
    setRemoteBody(container, "a.js", "original");

    const result = await pushCustomization({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("push");
    expect(container.customizationConfigurator.lastUpdateParams?.revision).toBe(
      "1",
    );
  });

  it("still blocks when the app revision moved and both sides diverge (AC-8 b)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    setLocalBody(container, "a.js", "local-body");
    setRemoteBody(container, "a.js", "remote-body");

    await expect(
      pushCustomization({ container, input: { basePath: BASE } }),
    ).rejects.toSatisfy(isConfigDrift);
  });

  it("still pushes when the local declaration was removed (AC-8 d)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, {
      scope: "ALL",
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
    });
    setRemote(container, [remoteFile("a.js")], "2");
    setRemoteBody(container, "a.js", "remote-body");

    const result = await pushCustomization({
      container,
      input: { basePath: BASE },
    });

    expect(result.mode).toBe("push");
  });

  it("adds the inferred-classification hint when an inferred key caused the drift (AC-18)", async () => {
    const container = getContainer();
    setState(container, localFile("a.js"), "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "2");
    setLocalBody(container, "a.js", "local-body");
    setRemoteBody(container, "a.js", "remote-body");

    const error = await pushCustomization({
      container,
      input: { basePath: BASE },
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
    const message = (error as ConflictError).message;
    expect(message).toContain(
      "Drift possibly inferred: no recorded content baseline for 1 of the drifted file(s).",
    );
    expect(message).toContain("customize diff");
  });

  it("keeps the plain drift message when no inferred key is involved (AC-18)", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js"), remoteFile("b.js")], "2");
    matchFile(container, "a.js", "v1");

    const error = await pushCustomization({
      container,
      input: { basePath: BASE },
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).message).not.toContain(
      "no recorded content baseline",
    );
  });
});

describe("pushCustomization — round trip (AC-12)", () => {
  const getContainer = setupTestCustomizationContainer();

  it("reports no differences when diffing right after a non-forced push", async () => {
    const container = getContainer();
    setState(
      container,
      localFile("a.js"),
      "1",
      baseDigests({ "desktop:js:a.js": "v1" }),
    );
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    setLocalBody(container, "a.js", "v2");
    setRemoteBody(container, "a.js", "v1");

    await pushCustomization({ container, input: { basePath: BASE } });

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

function isConfigDrift(error: unknown): boolean {
  return (
    error instanceof ConflictError &&
    error.code === ConflictErrorCode.ConfigDrift
  );
}
