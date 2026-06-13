import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestRecordPermissionContainer } from "@/core/application/__tests__/helpers";
import type { TestRecordPermissionContainer } from "@/core/application/__tests__/helpers/recordPermission";
import type {
  RecordPermissionConfig,
  RecordRight,
} from "@/core/domain/recordPermission/entity";
import { RecordPermissionConfigSerializer } from "@/core/domain/recordPermission/services/configSerializer";
import { RecordPermissionStateSerializer } from "@/core/domain/recordPermission/services/recordPermissionStateSerializer";
import { detectRecordPermissionThreeWayDiff } from "../detectRecordPermissionThreeWayDiff";

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

function yamlOf(config: RecordPermissionConfig): string {
  return configCodec.stringify(
    RecordPermissionConfigSerializer.serialize(config),
  );
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

describe("detectRecordPermissionThreeWayDiff", () => {
  const getContainer = setupTestRecordPermissionContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.recordPermissionStorage.setContent(yamlOf(baseConfig));
    container.recordPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await detectRecordPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change keyed by filterCond#i", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(
      yamlOf({ rights: [right("x = 1", false)] }),
    );
    container.recordPermissionConfigurator.setPermissions({
      rights: baseConfig.rights,
      revision: "1",
    });

    const result = await detectRecordPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toContain("x = 1#0");
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(yamlOf(baseConfig));
    container.recordPermissionConfigurator.setPermissions({
      rights: [right("x = 1", false)],
      revision: "2",
    });

    const result = await detectRecordPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toContain("x = 1#0");
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.recordPermissionStorage.setContent(
      yamlOf({ rights: [right("x = 1", false)] }),
    );
    container.recordPermissionConfigurator.setPermissions({
      rights: [
        {
          filterCond: "x = 1",
          entities: [
            {
              entity: { type: "USER", code: "u1" },
              viewable: true,
              editable: true,
              deletable: false,
              includeSubs: false,
            },
          ],
        },
      ],
      revision: "2",
    });

    const result = await detectRecordPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toContain("x = 1#0");
    }
  });

  it("treats reordering across filterCond groups as no change (grouped by filterCond)", async () => {
    const container = getContainer();
    const ordered: RecordPermissionConfig = {
      rights: [right("x = 1", true), right("y = 2", true)],
    };
    setState(container, ordered, "1");
    // local has the two filterCond groups in reversed order; remote unchanged.
    container.recordPermissionStorage.setContent(
      yamlOf({ rights: [right("y = 2", true), right("x = 1", true)] }),
    );
    container.recordPermissionConfigurator.setPermissions({
      rights: ordered.rights,
      revision: "1",
    });

    const result = await detectRecordPermissionThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.isEmpty).toBe(true);
    }
  });
});
