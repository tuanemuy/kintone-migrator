import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestAppPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestAppPermissionContainer } from "@/core/application/__tests__/helpers/appPermission";
import type {
  AppPermissionConfig,
  AppRight,
} from "@/core/domain/appPermission/entity";
import { AppPermissionStateSerializer } from "@/core/domain/appPermission/services/appPermissionStateSerializer";
import { AppPermissionConfigSerializer } from "@/core/domain/appPermission/services/configSerializer";
import { detectAppPermissionThreeWayDiff } from "../detectAppPermissionThreeWayDiff";

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

function yamlOf(config: AppPermissionConfig): string {
  return configCodec.stringify(AppPermissionConfigSerializer.serialize(config));
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

describe("detectAppPermissionThreeWayDiff", () => {
  const getContainer = setupTestAppPermissionContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.appPermissionStorage.setContent(yamlOf(baseConfig));
    container.appPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await detectAppPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(
      yamlOf({ rights: [right("u1", { appEditable: true })] }),
    );
    container.appPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await detectAppPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toContain("USER:u1");
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(yamlOf(baseConfig));
    container.appPermissionConfigurator.setPermissions({
      rights: [right("u1", { appEditable: true })],
      revision: "2",
    });

    const result = await detectAppPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toContain("USER:u1");
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.appPermissionStorage.setContent(
      yamlOf({ rights: [right("u1", { appEditable: true })] }),
    );
    container.appPermissionConfigurator.setPermissions({
      rights: [right("u1", { appEditable: false, recordAddable: true })],
      revision: "2",
    });

    const result = await detectAppPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toContain("USER:u1");
    }
  });

  it("ignores a pure reorder of the rights list (entity-keyed)", async () => {
    const container = getContainer();
    const ordered: AppPermissionConfig = {
      rights: [right("u1"), right("u2")],
    };
    setState(container, ordered, "1");
    // local has the same two rights in reversed order; remote unchanged.
    container.appPermissionStorage.setContent(
      yamlOf({ rights: [right("u2"), right("u1")] }),
    );
    container.appPermissionConfigurator.setPermissions({
      rights: ordered.rights,
      revision: "1",
    });

    const result = await detectAppPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.isEmpty).toBe(true);
    }
  });
});
