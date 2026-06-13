import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestAppPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestAppPermissionContainer } from "@/core/application/__tests__/helpers/appPermission";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type {
  AppPermissionConfig,
  AppRight,
} from "@/core/domain/appPermission/entity";
import { AppPermissionStateSerializer } from "@/core/domain/appPermission/services/appPermissionStateSerializer";
import { pushAppPermission } from "../pushAppPermission";

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

describe("pushAppPermission", () => {
  const getContainer = setupTestAppPermissionContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.appPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    await expect(pushAppPermission({ container, input: {} })).rejects.toSatisfy(
      isValidationError,
    );
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(aclYaml(true));
    container.appPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await pushAppPermission({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(container.appPermissionConfigurator.lastUpdateParams?.revision).toBe(
      "1",
    );
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(aclYaml(false));
    container.appPermissionConfigurator.setPermissions({
      rights: [right("u1", { appEditable: true })],
      revision: "2",
    });

    await expect(pushAppPermission({ container, input: {} })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.appPermissionConfigurator.callLog).not.toContain(
      "updateAppPermissions",
    );
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(aclYaml(true));
    container.appPermissionConfigurator.setPermissions({
      rights: [right("u1", { appEditable: false })],
      revision: "2",
    });

    const result = await pushAppPermission({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("push");
    expect(
      container.appPermissionConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.appPermissionStorage.setContent(aclYaml(false));
    container.appPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "5",
    });

    const result = await pushAppPermission({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.appPermissionConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.appPermissionStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
