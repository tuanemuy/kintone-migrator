import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestRecordPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestRecordPermissionContainer } from "@/core/application/__tests__/helpers/recordPermission";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type {
  RecordPermissionConfig,
  RecordRight,
} from "@/core/domain/recordPermission/entity";
import { RecordPermissionStateSerializer } from "@/core/domain/recordPermission/services/recordPermissionStateSerializer";
import { pushRecordPermission } from "../pushRecordPermission";

function right(filterCond: string, viewable: boolean): RecordRight {
  return {
    filterCond,
    entities: [
      {
        entity: { type: "USER", code: "u1" },
        viewable,
        editable: false,
        deletable: false,
        includeSubs: false,
      },
    ],
  };
}

function aclYaml(viewable: boolean): string {
  return `rights:\n  - filterCond: "x = 1"\n    entities:\n      - entity:\n          type: USER\n          code: u1\n        viewable: ${viewable}\n        editable: false\n        deletable: false\n        includeSubs: false\n`;
}

function setState(
  container: TestRecordPermissionContainer,
  config: RecordPermissionConfig,
  revision: string,
): void {
  container.recordPermissionStateStorage.setContent(
    configCodec.stringify(
      RecordPermissionStateSerializer.serialize({ config }),
    ),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

const baseConfig: RecordPermissionConfig = {
  rights: [right("x = 1", true)],
};

describe("pushRecordPermission", () => {
  const getContainer = setupTestRecordPermissionContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.recordPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    await expect(
      pushRecordPermission({ container, input: {} }),
    ).rejects.toSatisfy(isValidationError);
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(aclYaml(false));
    container.recordPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await pushRecordPermission({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(
      container.recordPermissionConfigurator.lastUpdateParams?.revision,
    ).toBe("1");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(aclYaml(true));
    container.recordPermissionConfigurator.setPermissions({
      rights: [right("x = 1", false)],
      revision: "2",
    });

    await expect(
      pushRecordPermission({ container, input: {} }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.recordPermissionConfigurator.callLog).not.toContain(
      "updateRecordPermissions",
    );
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(aclYaml(false));
    container.recordPermissionConfigurator.setPermissions({
      rights: [right("x = 1", true)],
      revision: "2",
    });

    const result = await pushRecordPermission({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("push");
    expect(
      container.recordPermissionConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.recordPermissionStorage.setContent(aclYaml(true));
    container.recordPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "5",
    });

    const result = await pushRecordPermission({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.recordPermissionConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.recordPermissionStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
