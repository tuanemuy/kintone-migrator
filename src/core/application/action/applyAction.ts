import type { ActionServiceArgs } from "../container/action";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseActionConfigText } from "./parseConfig";

export async function applyAction({
  container,
}: ActionServiceArgs): Promise<void> {
  const result = await container.actionStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Action config file not found",
    );
  }
  const config = parseActionConfigText(result.content);

  const current = await container.actionConfigurator.getActions();

  await container.actionConfigurator.updateActions({
    actions: config.actions,
    revision: current.revision,
  });
}
