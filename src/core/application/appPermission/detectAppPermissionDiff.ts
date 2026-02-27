import { AppPermissionDiffDetector } from "@/core/domain/appPermission/services/diffDetector";
import type { AppPermissionDiff } from "@/core/domain/appPermission/valueObject";
import type { AppPermissionServiceArgs } from "../container/appPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseAppPermissionConfigText } from "./parseConfig";

export async function detectAppPermissionDiff({
  container,
}: AppPermissionServiceArgs): Promise<AppPermissionDiff> {
  const result = await container.appPermissionStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "App permission config file not found",
    );
  }
  const localConfig = parseAppPermissionConfigText(result.content);

  const { rights: remoteRights } =
    await container.appPermissionConfigurator.getAppPermissions();

  return AppPermissionDiffDetector.detect(localConfig, {
    rights: remoteRights,
  });
}
