import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestProcessManagementContainer } from "@/core/application/__tests__/helpers";
import type { TestProcessManagementContainer } from "@/core/application/__tests__/helpers/processManagement";
import { ConflictError, ConflictErrorCode } from "@/core/application/error";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementConfigParser } from "@/core/domain/processManagement/services/configParser";
import { ProcessManagementConfigSerializer } from "@/core/domain/processManagement/services/configSerializer";
import { ProcessManagementStateParser } from "@/core/domain/processManagement/services/processManagementStateParser";
import type {
  ProcessAction,
  ProcessAssignee,
} from "@/core/domain/processManagement/valueObject";
import { applyProcessManagement } from "../applyProcessManagement";
import { captureProcessManagement } from "../captureProcessManagement";
import { detectProcessManagementDiff } from "../detectProcessManagementDiff";
import { detectProcessManagementThreeWayDiff } from "../detectProcessManagementThreeWayDiff";
import {
  applyPulledProcessManagementMerge,
  pullProcessManagement,
} from "../pullProcessManagement";
import { pushProcessManagement } from "../pushProcessManagement";

const assignee: ProcessAssignee = { type: "ONE", entities: [] };

function action(
  name: string,
  from: string,
  to: string,
  filterCond = "",
): ProcessAction {
  return { name, from, to, filterCond, type: "PRIMARY" };
}

// One of each shape kintone accepts: same name from different states,
// conditional branches from one state, and repeats of one transition.
const remoteConfig: ProcessManagementConfig = {
  enable: true,
  states: {
    未処理: { index: 0, assignee },
    一次承認待ち: { index: 1, assignee },
    最終承認待ち: { index: 2, assignee },
    課長承認待ち: { index: 3, assignee },
    完了: { index: 4, assignee },
  },
  actions: [
    action("差し戻し", "一次承認待ち", "未処理"),
    action("差し戻し", "最終承認待ち", "未処理"),
    action("申請する", "未処理", "課長承認待ち", "金額 < 500000"),
    action("申請する", "未処理", "一次承認待ち", "金額 >= 500000"),
    action("承認", "一次承認待ち", "最終承認待ち", '部署 in ("営業")'),
    action("承認", "一次承認待ち", "最終承認待ち", '部署 in ("開発")'),
    action("承認", "最終承認待ち", "完了"),
  ],
};

function withSecondRepeatCondition(
  filterCond: string,
): ProcessManagementConfig {
  return {
    ...remoteConfig,
    actions: remoteConfig.actions.map((a, i) =>
      i === 5 ? { ...a, filterCond } : a,
    ),
  };
}

function toYaml(config: ProcessManagementConfig): string {
  return configCodec.stringify(
    ProcessManagementConfigSerializer.serialize(config),
  );
}

async function readLocalConfig(
  container: TestProcessManagementContainer,
): Promise<ProcessManagementConfig> {
  const result = await container.processManagementStorage.get();
  if (!result.exists) throw new Error("local config not written");
  return ProcessManagementConfigParser.parse(configCodec.parse(result.content));
}

async function readStateConfig(
  container: TestProcessManagementContainer,
): Promise<ProcessManagementConfig> {
  const result = await container.processManagementStateStorage.get();
  if (!result.exists) throw new Error("state not written");
  return ProcessManagementStateParser.parse(configCodec.parse(result.content))
    .config;
}

describe("same-named process actions", () => {
  const getContainer = setupTestProcessManagementContainer();

  describe("capture / diff / apply", () => {
    it("reports no diff after saving the captured config", async () => {
      const container = getContainer();
      container.processManagementConfigurator.setConfig(remoteConfig);

      const { configText } = await captureProcessManagement({ container });
      container.processManagementStorage.setContent(configText);
      const diff = await detectProcessManagementDiff({ container });

      expect(diff.isEmpty).toBe(true);
    });

    it("reports only the changed repeat of one transition", async () => {
      const container = getContainer();
      container.processManagementConfigurator.setConfig(remoteConfig);
      container.processManagementStorage.setContent(
        toYaml(withSecondRepeatCondition('部署 in ("人事")')),
      );

      const diff = await detectProcessManagementDiff({ container });

      expect(diff.entries).toEqual([
        {
          type: "modified",
          category: "action",
          name: "承認 (一次承認待ち → 最終承認待ち) #2",
          details: 'filterCond: "部署 in ("開発")" -> "部署 in ("人事")"',
        },
      ]);
    });

    it("applies every same-named action in order", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(toYaml(remoteConfig));

      await applyProcessManagement({ container });

      expect(
        container.processManagementConfigurator.lastUpdateParams?.config
          .actions,
      ).toEqual(remoteConfig.actions);
    });
  });

  describe("pull / push", () => {
    async function pullFirstTime(
      container: TestProcessManagementContainer,
    ): Promise<void> {
      container.processManagementConfigurator.setConfig(remoteConfig, "1");
      const result = await pullProcessManagement({ container, input: {} });
      expect(result.mode).toBe("firstTime");
    }

    it("reports no 3-way diff right after the first pull", async () => {
      const container = getContainer();
      await pullFirstTime(container);

      const diff = await detectProcessManagementThreeWayDiff({ container });

      expect(diff.mode).toBe("three-way");
      if (diff.mode === "three-way") {
        expect(diff.isEmpty).toBe(true);
      }
      expect(await readLocalConfig(container)).toEqual(remoteConfig);
      expect(await readStateConfig(container)).toEqual(remoteConfig);
    });

    it("detects remote drift in one repeat and refuses to push", async () => {
      const container = getContainer();
      await pullFirstTime(container);
      container.processManagementConfigurator.setConfig(
        withSecondRepeatCondition('部署 in ("人事")'),
        "2",
      );

      const diff = await detectProcessManagementThreeWayDiff({ container });

      expect(diff.mode).toBe("three-way");
      if (diff.mode === "three-way") {
        expect(diff.remoteDrift.map((e) => e.key)).toEqual(["process"]);
        expect(diff.localChanges).toHaveLength(0);
        expect(diff.conflicts).toHaveLength(0);
      }
      await expect(
        pushProcessManagement({ container, input: {} }),
      ).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof ConflictError &&
          e.code === ConflictErrorCode.ConfigDrift,
      );
      expect(container.processManagementConfigurator.callLog).not.toContain(
        "updateProcessManagement",
      );
    });

    it("writes every action back when pulling remote drift in one repeat", async () => {
      const container = getContainer();
      await pullFirstTime(container);
      const drifted = withSecondRepeatCondition('部署 in ("人事")');
      container.processManagementConfigurator.setConfig(drifted, "2");

      const pull = await pullProcessManagement({ container, input: {} });
      if (pull.mode !== "merged") throw new Error("expected merged");
      await applyPulledProcessManagementMerge({
        container,
        input: {
          merge: pull.merge,
          resolution: "remote",
          remoteConfig: pull.remoteConfig,
          remoteRevision: pull.remoteRevision,
        },
      });

      expect(await readLocalConfig(container)).toEqual(drifted);
      expect(await readStateConfig(container)).toEqual(drifted);
    });

    it("pushes a local change to one repeat with every action", async () => {
      const container = getContainer();
      await pullFirstTime(container);
      const changed = withSecondRepeatCondition('部署 in ("人事")');
      container.processManagementStorage.setContent(toYaml(changed));

      const diff = await detectProcessManagementThreeWayDiff({ container });
      expect(diff.mode).toBe("three-way");
      if (diff.mode === "three-way") {
        expect(diff.localChanges.map((e) => e.key)).toEqual(["process"]);
        expect(diff.remoteDrift).toHaveLength(0);
      }

      const result = await pushProcessManagement({ container, input: {} });

      expect(result.mode).toBe("push");
      expect(
        container.processManagementConfigurator.lastUpdateParams?.config,
      ).toEqual(changed);
      expect(await readStateConfig(container)).toEqual(changed);
    });

    it("keeps state and revision when kintone rejects the pushed config", async () => {
      const container = getContainer();
      await pullFirstTime(container);
      container.processManagementStorage.setContent(
        toYaml(withSecondRepeatCondition('部署 in ("人事")')),
      );
      container.processManagementConfigurator.setFailOn(
        "updateProcessManagement",
      );
      const stateBefore = await container.processManagementStateStorage.get();
      const revisionBefore = await container.appRevisionStorage.get();

      await expect(
        pushProcessManagement({ container, input: {} }),
      ).rejects.toThrow();

      expect(await container.processManagementStateStorage.get()).toEqual(
        stateBefore,
      );
      expect(await container.appRevisionStorage.get()).toEqual(revisionBefore);
    });
  });
});
