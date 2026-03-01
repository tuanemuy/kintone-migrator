import { RecordPermissionDiffDetector } from "@/core/domain/recordPermission/services/diffDetector";
import type { RecordPermissionDiff } from "@/core/domain/recordPermission/valueObject";

export type { RecordPermissionDiffEntry } from "@/core/domain/recordPermission/valueObject";

import type { RecordPermissionDiffServiceArgs } from "../container/recordPermission";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseRecordPermissionConfigText } from "./parseConfig";

export async function detectRecordPermissionDiff({
  container,
}: RecordPermissionDiffServiceArgs): Promise<RecordPermissionDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.recordPermissionStorage.get(),
    fetchRemote: () =>
      container.recordPermissionConfigurator.getRecordPermissions(),
    parseConfig: parseRecordPermissionConfigText,
    detect: (local, remote) =>
      RecordPermissionDiffDetector.detect(local, { rights: remote.rights }),
    notFoundMessage: "Record permission config file not found",
  });
}
