import { ActionDiffDetector } from "@/core/domain/action/services/diffDetector";
import type { ActionDiff } from "@/core/domain/action/valueObject";

export type { ActionDiffEntry } from "@/core/domain/action/valueObject";

import type { ActionDiffServiceArgs } from "../container/action";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseActionConfigText } from "./parseConfig";

export async function detectActionDiff({
  container,
}: ActionDiffServiceArgs): Promise<ActionDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.actionStorage.get(),
    fetchRemote: () => container.actionConfigurator.getActions(),
    parseConfig: parseActionConfigText,
    detect: (local, remote) =>
      ActionDiffDetector.detect(local, { actions: remote.actions }),
    notFoundMessage: "Action config file not found",
  });
}
