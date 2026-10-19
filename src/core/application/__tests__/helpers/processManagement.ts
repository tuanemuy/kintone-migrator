import type { ProcessManagementContainer } from "@/core/application/container/processManagement";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";
import type { ProcessManagementStateStorage } from "@/core/domain/processManagement/ports/processManagementStateStorage";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import { ProcessManagementConfigParser } from "@/core/domain/processManagement/services/configParser";
import { ProcessManagementConfigSerializer } from "@/core/domain/processManagement/services/configSerializer";
import { ProcessManagementStateParser } from "@/core/domain/processManagement/services/processManagementStateParser";
import type {
  ProcessAction,
  ProcessAssignee,
} from "@/core/domain/processManagement/valueObject";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryAppRevisionReader,
  InMemoryAppRevisionStorage,
  InMemoryFileStorage,
  setupContainer,
  testConfigCodec,
} from "./shared";

export class InMemoryProcessManagementConfigurator
  extends FakeBase
  implements ProcessManagementConfigurator
{
  private config: ProcessManagementConfig = {
    enable: false,
    states: {},
    actions: [],
  };
  private revision = "1";
  lastUpdateParams: {
    config: ProcessManagementConfig;
    revision?: string;
  } | null = null;

  async getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    revision: string;
  }> {
    this.trackCall("getProcessManagement");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateProcessManagement(params: {
    config: ProcessManagementConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.trackCall("updateProcessManagement");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setConfig(config: ProcessManagementConfig, revision?: string): void {
    this.config = config;
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryProcessManagementStorage
  extends InMemoryFileStorage
  implements ProcessManagementStorage {}

export class InMemoryProcessManagementStateStorage
  extends InMemoryFileStorage
  implements ProcessManagementStateStorage {}

export type TestProcessManagementContainer = ProcessManagementContainer & {
  processManagementConfigurator: InMemoryProcessManagementConfigurator;
  processManagementStorage: InMemoryProcessManagementStorage;
  processManagementStateStorage: InMemoryProcessManagementStateStorage;
  appRevisionStorage: InMemoryAppRevisionStorage;
  appRevisionReader: InMemoryAppRevisionReader;
  appDeployer: InMemoryAppDeployer;
};

export function createTestProcessManagementContainer(): TestProcessManagementContainer {
  return {
    configCodec: testConfigCodec,
    processManagementConfigurator: new InMemoryProcessManagementConfigurator(),
    processManagementStorage: new InMemoryProcessManagementStorage(),
    processManagementStateStorage: new InMemoryProcessManagementStateStorage(),
    appRevisionStorage: new InMemoryAppRevisionStorage(),
    appRevisionReader: new InMemoryAppRevisionReader(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestProcessManagementContainer(): () => TestProcessManagementContainer {
  return setupContainer(createTestProcessManagementContainer);
}

const unassigned: ProcessAssignee = { type: "ONE", entities: [] };

function primaryAction(
  name: string,
  from: string,
  to: string,
  filterCond = "",
): ProcessAction {
  return { name, from, to, filterCond, type: "PRIMARY" };
}

/**
 * A config with every shape of same-named actions kintone accepts: the same
 * name from different states, conditional branches from one state, and
 * repeats of one name + from + to (the 5th and 6th actions).
 */
export const SAME_NAMED_ACTIONS_CONFIG: ProcessManagementConfig = {
  enable: true,
  states: {
    未処理: { index: 0, assignee: unassigned },
    一次承認待ち: { index: 1, assignee: unassigned },
    最終承認待ち: { index: 2, assignee: unassigned },
    課長承認待ち: { index: 3, assignee: unassigned },
    完了: { index: 4, assignee: unassigned },
  },
  actions: [
    primaryAction("差し戻し", "一次承認待ち", "未処理"),
    primaryAction("差し戻し", "最終承認待ち", "未処理"),
    primaryAction("申請する", "未処理", "課長承認待ち", "金額 < 500000"),
    primaryAction("申請する", "未処理", "一次承認待ち", "金額 >= 500000"),
    primaryAction("承認", "一次承認待ち", "最終承認待ち", '部署 in ("営業")'),
    primaryAction("承認", "一次承認待ち", "最終承認待ち", '部署 in ("開発")'),
    primaryAction("承認", "最終承認待ち", "完了"),
  ],
};

/** {@link SAME_NAMED_ACTIONS_CONFIG} with only the second repeat's filterCond changed. */
export const SAME_NAMED_ACTIONS_CONFIG_SECOND_REPEAT_CHANGED: ProcessManagementConfig =
  {
    ...SAME_NAMED_ACTIONS_CONFIG,
    actions: SAME_NAMED_ACTIONS_CONFIG.actions.map((action, i) =>
      i === 5 ? { ...action, filterCond: '部署 in ("人事")' } : action,
    ),
  };

export function serializeProcessConfig(
  config: ProcessManagementConfig,
): string {
  return testConfigCodec.stringify(
    ProcessManagementConfigSerializer.serialize(config),
  );
}

export async function readLocalProcessConfig(
  container: TestProcessManagementContainer,
): Promise<ProcessManagementConfig> {
  const result = await container.processManagementStorage.get();
  if (!result.exists) throw new Error("local process config not written");
  return ProcessManagementConfigParser.parse(
    testConfigCodec.parse(result.content),
  );
}

export async function readProcessStateConfig(
  container: TestProcessManagementContainer,
): Promise<ProcessManagementConfig> {
  const result = await container.processManagementStateStorage.get();
  if (!result.exists) throw new Error("process state not written");
  return ProcessManagementStateParser.parse(
    testConfigCodec.parse(result.content),
  ).config;
}
