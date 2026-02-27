import { ActionDiffDetector } from "@/core/domain/action/services/diffDetector";
import type { ActionDiff } from "@/core/domain/action/valueObject";
import type { ActionServiceArgs } from "../container/action";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseActionConfigText } from "./parseConfig";

export async function detectActionDiff({
  container,
}: ActionServiceArgs): Promise<ActionDiff> {
  const result = await container.actionStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Action config file not found",
    );
  }
  const localConfig = parseActionConfigText(result.content);

  const { actions: remoteActions } =
    await container.actionConfigurator.getActions();

  return ActionDiffDetector.detect(localConfig, { actions: remoteActions });
}
