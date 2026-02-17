import { ViewDiffDetector } from "@/core/domain/view/services/diffDetector";
import type { ViewServiceArgs } from "../container/view";
import { ValidationError, ValidationErrorCode } from "../error";
import type { DetectViewDiffOutput } from "./dto";
import { parseViewConfigText } from "./parseConfig";

export async function detectViewDiff({
  container,
}: ViewServiceArgs): Promise<DetectViewDiffOutput> {
  const result = await container.viewStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "View config file not found",
    );
  }
  const config = parseViewConfigText(result.content);

  const { views: remoteViews } = await container.viewConfigurator.getViews();

  const diff = ViewDiffDetector.detect(config.views, remoteViews);

  return {
    entries: diff.entries,
    summary: diff.summary,
    isEmpty: diff.isEmpty,
  };
}
