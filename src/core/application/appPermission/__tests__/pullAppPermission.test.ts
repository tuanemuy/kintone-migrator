import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestAppPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestAppPermissionContainer } from "@/core/application/__tests__/helpers/appPermission";
import type {
  AppPermissionConfig,
  AppRight,
} from "@/core/domain/appPermission/entity";
import { AppPermissionStateSerializer } from "@/core/domain/appPermission/services/appPermissionStateSerializer";
import {
  applyPulledAppPermissionMerge,
  pullAppPermission,
} from "../pullAppPermission";

function right(code: string, overrides: Partial<AppRight> = {}): AppRight {
  return {
    entity: { type: "USER", code },
    includeSubs: false,
    appEditable: false,
    recordViewable: true,
    recordAddable: false,
    recordEditable: false,
    recordDeletable: false,
    recordImportable: false,
    recordExportable: false,
    ...overrides,
  };
}

function aclYaml(appEditable: boolean): string {
  return `rights:\n  - entity:\n      type: USER\n      code: u1\n    includeSubs: false\n    appEditable: ${appEditable}\n    recordViewable: true\n    recordAddable: false\n    recordEditable: false\n    recordDeletable: false\n    recordImportable: false\n    recordExportable: false\n`;
}

function setState(
  container: TestAppPermissionContainer,
  config: AppPermissionConfig,
  revision: string,
): void {
  container.appPermissionStateStorage.setContent(
    configCodec.stringify(AppPermissionStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

const baseConfig: AppPermissionConfig = {
  rights: [right("u1", { appEditable: false })],
};

describe("pullAppPermission", () => {
  const getContainer = setupTestAppPermissionContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.appPermissionConfigurator.setPermissions({
      rights: [right("u1", { appEditable: true })],
      revision: "7",
    });

    const result = await pullAppPermission({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.appPermissionStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(aclYaml(false));
    container.appPermissionConfigurator.setPermissions({
      rights: [right("u1", { appEditable: true })],
      revision: "2",
    });

    const result = await pullAppPermission({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("force");
  });

  it("returns the merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(aclYaml(true));
    container.appPermissionConfigurator.setPermissions({
      rights: [right("u1", { appEditable: false, recordAddable: true })],
      revision: "2",
    });

    const result = await pullAppPermission({ container, input: {} });

    expect(result.mode).toBe("merged");
    expect(container.appPermissionStorage.callLog).not.toContain("update");
    expect(container.appPermissionStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledAppPermissionMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(aclYaml(true));
    const remoteConfig: AppPermissionConfig = {
      rights: [right("u1", { appEditable: false, recordAddable: true })],
    };
    container.appPermissionConfigurator.setPermissions({
      rights: remoteConfig.rights,
      revision: "2",
    });

    const pull = await pullAppPermission({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledAppPermissionMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: new Map([["USER:u1", "remote"]]),
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.appPermissionStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
