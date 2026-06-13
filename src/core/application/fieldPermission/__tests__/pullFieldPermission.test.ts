import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestFieldPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestFieldPermissionContainer } from "@/core/application/__tests__/helpers/fieldPermission";
import type {
  FieldPermissionConfig,
  FieldRight,
} from "@/core/domain/fieldPermission/entity";
import { FieldPermissionStateSerializer } from "@/core/domain/fieldPermission/services/fieldPermissionStateSerializer";
import type { FieldRightAccessibility } from "@/core/domain/fieldPermission/valueObject";
import {
  applyPulledFieldPermissionMerge,
  pullFieldPermission,
} from "../pullFieldPermission";

function right(
  code: string,
  accessibility: FieldRightAccessibility,
): FieldRight {
  return {
    code,
    entities: [{ accessibility, entity: { type: "USER", code: "u1" } }],
  };
}

function aclYaml(accessibility: FieldRightAccessibility): string {
  return `rights:\n  - code: f1\n    entities:\n      - accessibility: ${accessibility}\n        entity:\n          type: USER\n          code: u1\n`;
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

describe("pullFieldPermission", () => {
  const getContainer = setupTestFieldPermissionContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.fieldPermissionConfigurator.setPermissions({
      rights: [right("f1", "WRITE")],
      revision: "7",
    });

    const result = await pullFieldPermission({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.fieldPermissionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(aclYaml("WRITE"));
    container.fieldPermissionConfigurator.setPermissions({
      rights: [right("f1", "READ")],
      revision: "2",
    });

    const result = await pullFieldPermission({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("force");
  });

  it("returns the merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(aclYaml("WRITE"));
    container.fieldPermissionConfigurator.setPermissions({
      rights: [right("f1", "NONE")],
      revision: "2",
    });

    const result = await pullFieldPermission({ container, input: {} });

    expect(result.mode).toBe("merged");
    expect(container.fieldPermissionStorage.callLog).not.toContain("update");
    expect(container.fieldPermissionStateStorage.callLog).not.toContain(
      "update",
    );
  });

  it("applyPulledFieldPermissionMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(aclYaml("WRITE"));
    const remoteConfig: FieldPermissionConfig = {
      rights: [right("f1", "NONE")],
    };
    container.fieldPermissionConfigurator.setPermissions({
      rights: remoteConfig.rights,
      revision: "2",
    });

    const pull = await pullFieldPermission({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledFieldPermissionMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: new Map([["f1", "remote"]]),
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.fieldPermissionStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
