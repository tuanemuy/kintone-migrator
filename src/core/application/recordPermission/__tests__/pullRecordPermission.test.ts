import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestRecordPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestRecordPermissionContainer } from "@/core/application/__tests__/helpers/recordPermission";
import type {
  RecordPermissionConfig,
  RecordRight,
} from "@/core/domain/recordPermission/entity";
import { RecordPermissionStateSerializer } from "@/core/domain/recordPermission/services/recordPermissionStateSerializer";
import {
  applyPulledRecordPermissionMerge,
  pullRecordPermission,
} from "../pullRecordPermission";

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

describe("pullRecordPermission", () => {
  const getContainer = setupTestRecordPermissionContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.recordPermissionConfigurator.setPermissions({
      rights: [right("x = 1", false)],
      revision: "7",
    });

    const result = await pullRecordPermission({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.recordPermissionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(aclYaml(true));
    container.recordPermissionConfigurator.setPermissions({
      rights: [right("x = 1", false)],
      revision: "2",
    });

    const result = await pullRecordPermission({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("force");
  });

  it("returns the merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(aclYaml(false));
    container.recordPermissionConfigurator.setPermissions({
      rights: [right("x = 1", true), right("y = 2", true)],
      revision: "2",
    });

    const result = await pullRecordPermission({ container, input: {} });

    expect(result.mode).toBe("merged");
    expect(container.recordPermissionStorage.callLog).not.toContain("update");
    expect(container.recordPermissionStateStorage.callLog).not.toContain(
      "update",
    );
  });

  it("applyPulledRecordPermissionMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(aclYaml(false));
    const remoteConfig: RecordPermissionConfig = {
      rights: [right("x = 1", true)],
    };
    container.recordPermissionConfigurator.setPermissions({
      rights: remoteConfig.rights,
      revision: "2",
    });

    const pull = await pullRecordPermission({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledRecordPermissionMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: new Map([["x = 1#0", "remote"]]),
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.recordPermissionStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
