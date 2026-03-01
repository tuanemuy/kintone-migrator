import { ProcessManagementDiffDetector } from "@/core/domain/processManagement/services/diffDetector";
import type { ProcessManagementDiff } from "@/core/domain/processManagement/valueObject";

export type { ProcessManagementDiffEntry } from "@/core/domain/processManagement/valueObject";

import type { ProcessManagementDiffServiceArgs } from "../container/processManagement";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseProcessManagementConfigText } from "./parseConfig";

export async function detectProcessManagementDiff({
  container,
}: ProcessManagementDiffServiceArgs): Promise<ProcessManagementDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.processManagementStorage.get(),
    fetchRemote: () =>
      container.processManagementConfigurator.getProcessManagement(),
    parseConfig: parseProcessManagementConfigText,
    detect: (local, remote) =>
      ProcessManagementDiffDetector.detect(local, remote.config),
    notFoundMessage: "Process management config file not found",
  });
}
