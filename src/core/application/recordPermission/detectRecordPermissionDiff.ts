import { RecordPermissionDiffDetector } from "@/core/domain/recordPermission/services/diffDetector";
import type { RecordPermissionDiff } from "@/core/domain/recordPermission/valueObject";
import type { RecordPermissionServiceArgs } from "../container/recordPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseRecordPermissionConfigText } from "./parseConfig";

export async function detectRecordPermissionDiff({
  container,
}: RecordPermissionServiceArgs): Promise<RecordPermissionDiff> {
  const result = await container.recordPermissionStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Record permission config file not found",
    );
  }
  const localConfig = parseRecordPermissionConfigText(result.content);

  const { rights: remoteRights } =
    await container.recordPermissionConfigurator.getRecordPermissions();

  return RecordPermissionDiffDetector.detect(localConfig, {
    rights: remoteRights,
  });
}
