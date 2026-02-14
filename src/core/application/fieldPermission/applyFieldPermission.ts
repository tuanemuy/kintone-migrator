import type { FieldPermissionServiceArgs } from "../container/fieldPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseFieldPermissionConfigText } from "./parseConfig";

export async function applyFieldPermission({
  container,
}: FieldPermissionServiceArgs): Promise<void> {
  const result = await container.fieldPermissionStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Field permission config file not found",
    );
  }
  const config = parseFieldPermissionConfigText(result.content);

  const current =
    await container.fieldPermissionConfigurator.getFieldPermissions();

  await container.fieldPermissionConfigurator.updateFieldPermissions({
    rights: config.rights,
    revision: current.revision,
  });
}
