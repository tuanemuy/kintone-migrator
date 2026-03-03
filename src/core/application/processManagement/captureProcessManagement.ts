import { ProcessManagementConfigSerializer } from "@/core/domain/processManagement/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { ProcessManagementServiceArgs } from "../container/processManagement";

export type CaptureProcessManagementOutput = CaptureOutput;

export async function captureProcessManagement({
  container,
}: ProcessManagementServiceArgs): Promise<CaptureProcessManagementOutput> {
  return captureFromConfig({
    fetchRemote: () =>
      container.processManagementConfigurator.getProcessManagement(),
    serialize: ({ config }) =>
      ProcessManagementConfigSerializer.serialize(config),
    getStorage: () => container.processManagementStorage.get(),
  });
}
