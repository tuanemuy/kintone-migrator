import { FieldPermissionDiffDetector } from "@/core/domain/fieldPermission/services/diffDetector";
import type { FieldPermissionDiff } from "@/core/domain/fieldPermission/valueObject";
import type { FieldPermissionDiffServiceArgs } from "../container/fieldPermission";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseFieldPermissionConfigText } from "./parseConfig";

export type { FieldPermissionDiffEntry } from "@/core/domain/fieldPermission/valueObject";

export async function detectFieldPermissionDiff({
  container,
}: FieldPermissionDiffServiceArgs): Promise<FieldPermissionDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.fieldPermissionStorage.get(),
    fetchRemote: () =>
      container.fieldPermissionConfigurator.getFieldPermissions(),
    parseConfig: parseFieldPermissionConfigText,
    detect: (local, remote) =>
      FieldPermissionDiffDetector.detect(local, { rights: remote.rights }),
    notFoundMessage: "Field permission config file not found",
  });
}
