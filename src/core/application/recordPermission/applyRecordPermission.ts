import type { RecordPermissionServiceArgs } from "../container/recordPermission";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseRecordPermissionConfigText } from "./parseConfig";

export async function applyRecordPermission({
  container,
}: RecordPermissionServiceArgs): Promise<void> {
  const result = await container.recordPermissionStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Record permission config file not found",
    );
  }
  const config = parseRecordPermissionConfigText(result.content);

  const current =
    await container.recordPermissionConfigurator.getRecordPermissions();

  await container.recordPermissionConfigurator.updateRecordPermissions({
    rights: config.rights,
    revision: current.revision,
  });
}
