import { ProcessManagementDiffDetector } from "@/core/domain/processManagement/services/diffDetector";
import type { ProcessManagementDiff } from "@/core/domain/processManagement/valueObject";
import type { ProcessManagementServiceArgs } from "../container/processManagement";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseProcessManagementConfigText } from "./parseConfig";

export async function detectProcessManagementDiff({
  container,
}: ProcessManagementServiceArgs): Promise<ProcessManagementDiff> {
  const result = await container.processManagementStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Process management config file not found",
    );
  }
  const localConfig = parseProcessManagementConfigText(result.content);

  const { config: remoteConfig } =
    await container.processManagementConfigurator.getProcessManagement();

  return ProcessManagementDiffDetector.detect(localConfig, remoteConfig);
}
