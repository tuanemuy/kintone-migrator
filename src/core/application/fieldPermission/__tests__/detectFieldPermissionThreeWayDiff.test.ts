import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestFieldPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestFieldPermissionContainer } from "@/core/application/__tests__/helpers/fieldPermission";
import type {
  FieldPermissionConfig,
  FieldRight,
} from "@/core/domain/fieldPermission/entity";
import { FieldPermissionConfigSerializer } from "@/core/domain/fieldPermission/services/configSerializer";
import { FieldPermissionStateSerializer } from "@/core/domain/fieldPermission/services/fieldPermissionStateSerializer";
import type { FieldRightAccessibility } from "@/core/domain/fieldPermission/valueObject";
import { detectFieldPermissionThreeWayDiff } from "../detectFieldPermissionThreeWayDiff";

function right(
  code: string,
  accessibility: FieldRightAccessibility,
): FieldRight {
  return {
    code,
    entities: [{ accessibility, entity: { type: "USER", code: "u1" } }],
  };
}

function yamlOf(config: FieldPermissionConfig): string {
  return configCodec.stringify(
    FieldPermissionConfigSerializer.serialize(config),
  );
}

function setState(
  container: TestFieldPermissionContainer,
  config: FieldPermissionConfig,
  revision: string,
): void {
  container.fieldPermissionStateStorage.setContent(
    configCodec.stringify(FieldPermissionStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

const baseConfig: FieldPermissionConfig = {
  rights: [right("f1", "READ")],
};

describe("detectFieldPermissionThreeWayDiff", () => {
  const getContainer = setupTestFieldPermissionContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.fieldPermissionStorage.setContent(yamlOf(baseConfig));
    container.fieldPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await detectFieldPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change keyed by field code", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(
      yamlOf({ rights: [right("f1", "WRITE")] }),
    );
    container.fieldPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await detectFieldPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toContain("f1");
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(yamlOf(baseConfig));
    container.fieldPermissionConfigurator.setPermissions({
      rights: [right("f1", "WRITE")],
      revision: "2",
    });

    const result = await detectFieldPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toContain("f1");
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(
      yamlOf({ rights: [right("f1", "WRITE")] }),
    );
    container.fieldPermissionConfigurator.setPermissions({
      rights: [right("f1", "NONE")],
      revision: "2",
    });

    const result = await detectFieldPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toContain("f1");
    }
  });

  it("ignores a pure reorder of the rights list (field-code-keyed)", async () => {
    const container = getContainer();
    const ordered: FieldPermissionConfig = {
      rights: [right("f1", "READ"), right("f2", "WRITE")],
    };
    setState(container, ordered, "1");
    // local has the same two fields in reversed order; remote unchanged.
    container.fieldPermissionStorage.setContent(
      yamlOf({ rights: [right("f2", "WRITE"), right("f1", "READ")] }),
    );
    container.fieldPermissionConfigurator.setPermissions({
      rights: ordered.rights,
      revision: "1",
    });

    const result = await detectFieldPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.isEmpty).toBe(true);
    }
  });
});
