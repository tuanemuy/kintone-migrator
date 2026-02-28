import { ViewDiffDetector } from "@/core/domain/view/services/diffDetector";
import type { ViewDiff } from "@/core/domain/view/valueObject";
import type { ViewServiceArgs } from "../container/view";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseViewConfigText } from "./parseConfig";

export async function detectViewDiff({
  container,
}: ViewServiceArgs): Promise<ViewDiff> {
  const result = await container.viewStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "View config file not found",
    );
  }
  const config = parseViewConfigText(result.content);

  const { views: remoteViews } = await container.viewConfigurator.getViews();

  return ViewDiffDetector.detect(config.views, remoteViews);
}
