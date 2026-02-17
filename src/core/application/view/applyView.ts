import type { ViewConfig } from "@/core/domain/view/entity";
import type { ViewServiceArgs } from "../container/view";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseViewConfigText } from "./parseConfig";

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
  const config = parseViewConfigText(result.content);

  const skippedBuiltinViews: string[] = [];
  const filteredViews: Record<string, ViewConfig> = {};

  for (const [name, view] of Object.entries(config.views)) {
    if (view.builtinType !== undefined) {
      skippedBuiltinViews.push(name);
    } else {
      filteredViews[name] = view;
    }
  }

  const current = await container.viewConfigurator.getViews();

  // Merge remote builtinType views to preserve them during the replacement operation
  for (const [name, view] of Object.entries(current.views)) {
    if (view.builtinType !== undefined && filteredViews[name] === undefined) {
      filteredViews[name] = view;
    }
  }

  await container.viewConfigurator.updateViews({
    views: filteredViews,
    revision: current.revision,
  });

  return { skippedBuiltinViews };
}
