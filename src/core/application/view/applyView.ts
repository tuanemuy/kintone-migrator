import type { ViewServiceArgs } from "../container/view";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseViewConfigText } from "./parseConfig";
import { prepareViewsForUpdate } from "./prepareViewsForUpdate";

export type ApplyViewOutput = {
  readonly skippedBuiltinViews: readonly string[];
};

export async function applyView({
  container,
}: ViewServiceArgs): Promise<ApplyViewOutput> {
  const result = await container.viewStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "View config file not found",
    );
  }
  const config = parseViewConfigText(container.configCodec, result.content);

  const current = await container.viewConfigurator.getViews();

  const { views, skippedBuiltinViews } = prepareViewsForUpdate(
    config.views,
    current.views,
  );

  await container.viewConfigurator.updateViews({
    views,
    revision: current.revision,
  });

  return { skippedBuiltinViews };
}
