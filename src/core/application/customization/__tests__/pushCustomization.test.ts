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
import { CustomizationStateSerializer } from "@/core/domain/customization/services/customizationStateSerializer";
import type {
  CustomizationScope,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import { pushCustomization } from "../pushCustomization";

const BASE = "/app";

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

/** Makes a shared file's local and remote content identical (no content drift). */
function matchFile(
  container: TestCustomizationContainer,
  name: string,
  body = `same-${name}`,
): void {
  const buf = new TextEncoder().encode(body).buffer;
  container.fileContentReader.setFile(`${BASE}/${name}`, buf);
  container.fileDownloader.setFile(`fk-${name}`, buf);
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
    const base = localFile("a.js");
    setState(container, base, "1");
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

  it("rejects with a ConfigDrift ConflictError when the remote added a file", async () => {
    const container = getContainer();
    const base = localFile("a.js");
    setState(container, base, "1");
    setLocal(container, localFile("a.js"));
    // remote drifted: added b.js relative to base.
    setRemote(container, [remoteFile("a.js"), remoteFile("b.js")], "2");

    await expect(
      pushCustomization({ container, input: { basePath: BASE } }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.customizationConfigurator.callLog).not.toContain(
      "updateCustomization",
    );
  });

  it("rejects when a same-name file content diverges on both sides (conflict)", async () => {
    const container = getContainer();
    const base = localFile("a.js");
    setState(container, base, "1");
    setLocal(container, localFile("a.js"));
    setRemote(container, [remoteFile("a.js")], "1");
    // make local content differ from remote content → modifiedFileNames has a.js
    container.fileContentReader.setFile(
      `${BASE}/a.js`,
      new TextEncoder().encode("local-body").buffer,
    );
    container.fileDownloader.setFile(
      "fk-a.js",
      new TextEncoder().encode("remote-body").buffer,
    );

    await expect(
      pushCustomization({ container, input: { basePath: BASE } }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    const base = localFile("a.js");
    setState(container, base, "1");
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
