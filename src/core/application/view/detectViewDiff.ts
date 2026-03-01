import { ViewDiffDetector } from "@/core/domain/view/services/diffDetector";
import type { ViewDiff } from "@/core/domain/view/valueObject";

export type { ViewDiffEntry } from "@/core/domain/view/valueObject";

import type { ViewDiffServiceArgs } from "../container/view";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseViewConfigText } from "./parseConfig";

export async function detectViewDiff({
  container,
}: ViewDiffServiceArgs): Promise<ViewDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.viewStorage.get(),
    fetchRemote: () => container.viewConfigurator.getViews(),
    parseConfig: (content) => parseViewConfigText(content).views,
    detect: (views, remote) => ViewDiffDetector.detect(views, remote.views),
    notFoundMessage: "View config file not found",
  });
}
