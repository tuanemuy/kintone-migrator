import { AppPermissionDiffDetector } from "@/core/domain/appPermission/services/diffDetector";
import type { AppPermissionDiff } from "@/core/domain/appPermission/valueObject";
import type { AppPermissionDiffServiceArgs } from "../container/appPermission";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseAppPermissionConfigText } from "./parseConfig";

export type { AppPermissionDiffEntry } from "@/core/domain/appPermission/valueObject";

export async function detectAppPermissionDiff({
  container,
}: AppPermissionDiffServiceArgs): Promise<AppPermissionDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.appPermissionStorage.get(),
    fetchRemote: () => container.appPermissionConfigurator.getAppPermissions(),
    parseConfig: parseAppPermissionConfigText,
    detect: (local, remote) =>
      AppPermissionDiffDetector.detect(local, { rights: remote.rights }),
    notFoundMessage: "App permission config file not found",
  });
}
