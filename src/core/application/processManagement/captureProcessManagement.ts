import { ProcessManagementConfigSerializer } from "@/core/domain/processManagement/services/configSerializer";
import type { ProcessManagementServiceArgs } from "../container/processManagement";

export type CaptureProcessManagementOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureProcessManagement({
  container,
}: ProcessManagementServiceArgs): Promise<CaptureProcessManagementOutput> {
  const { config } =
    await container.processManagementConfigurator.getProcessManagement();

  const configText = ProcessManagementConfigSerializer.serialize(config);
  const existing = await container.processManagementStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
