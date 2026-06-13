import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestFieldPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestFieldPermissionContainer } from "@/core/application/__tests__/helpers/fieldPermission";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type {
  FieldPermissionConfig,
  FieldRight,
} from "@/core/domain/fieldPermission/entity";
import { FieldPermissionStateSerializer } from "@/core/domain/fieldPermission/services/fieldPermissionStateSerializer";
import type { FieldRightAccessibility } from "@/core/domain/fieldPermission/valueObject";
import { pushFieldPermission } from "../pushFieldPermission";

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

describe("pushFieldPermission", () => {
  const getContainer = setupTestFieldPermissionContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.fieldPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    await expect(
      pushFieldPermission({ container, input: {} }),
    ).rejects.toSatisfy(isValidationError);
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(aclYaml("WRITE"));
    container.fieldPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await pushFieldPermission({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(
      container.fieldPermissionConfigurator.lastUpdateParams?.revision,
    ).toBe("1");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(aclYaml("READ"));
    container.fieldPermissionConfigurator.setPermissions({
      rights: [right("f1", "WRITE")],
      revision: "2",
    });

    await expect(
      pushFieldPermission({ container, input: {} }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.fieldPermissionConfigurator.callLog).not.toContain(
      "updateFieldPermissions",
    );
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.fieldPermissionStorage.setContent(aclYaml("WRITE"));
    container.fieldPermissionConfigurator.setPermissions({
      rights: [right("f1", "READ")],
      revision: "2",
    });

    const result = await pushFieldPermission({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("push");
    expect(
      container.fieldPermissionConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.fieldPermissionStorage.setContent(aclYaml("READ"));
    container.fieldPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "5",
    });

    const result = await pushFieldPermission({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.fieldPermissionConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.fieldPermissionStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
