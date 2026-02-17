import type { AppPermissionServiceArgs } from "../container/appPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseAppPermissionConfigText } from "./parseConfig";

export async function applyAppPermission({
  container,
}: AppPermissionServiceArgs): Promise<void> {
  const result = await container.appPermissionStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "App permission config file not found",
    );
  }
  const config = parseAppPermissionConfigText(result.content);

  const current = await container.appPermissionConfigurator.getAppPermissions();

  await container.appPermissionConfigurator.updateAppPermissions({
    rights: config.rights,
    revision: current.revision,
  });
}
