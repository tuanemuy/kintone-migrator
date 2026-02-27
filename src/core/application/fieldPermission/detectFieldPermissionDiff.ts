import { FieldPermissionDiffDetector } from "@/core/domain/fieldPermission/services/diffDetector";
import type { FieldPermissionDiff } from "@/core/domain/fieldPermission/valueObject";
import type { FieldPermissionServiceArgs } from "../container/fieldPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseFieldPermissionConfigText } from "./parseConfig";

export async function detectFieldPermissionDiff({
  container,
}: FieldPermissionServiceArgs): Promise<FieldPermissionDiff> {
  const result = await container.fieldPermissionStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Field permission config file not found",
    );
  }
  const localConfig = parseFieldPermissionConfigText(result.content);

  const { rights: remoteRights } =
    await container.fieldPermissionConfigurator.getFieldPermissions();

  return FieldPermissionDiffDetector.detect(localConfig, {
    rights: remoteRights,
  });
}
