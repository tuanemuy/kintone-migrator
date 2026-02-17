import type { ProcessManagementServiceArgs } from "../container/processManagement";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseProcessManagementConfigText } from "./parseConfig";

export type ApplyProcessManagementOutput = {
  readonly enableChanged: boolean;
  readonly newEnable: boolean;
};

export async function applyProcessManagement({
  container,
}: ProcessManagementServiceArgs): Promise<ApplyProcessManagementOutput> {
  const result = await container.processManagementStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Process management config file not found",
    );
  }
  const config = parseProcessManagementConfigText(result.content);

  const current =
    await container.processManagementConfigurator.getProcessManagement();

  const enableChanged = current.config.enable !== config.enable;

  await container.processManagementConfigurator.updateProcessManagement({
    config,
    revision: current.revision,
  });

  return {
    enableChanged,
    newEnable: config.enable,
  };
}
