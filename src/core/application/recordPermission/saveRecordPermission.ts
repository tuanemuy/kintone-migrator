import type { RecordPermissionServiceArgs } from "../container/recordPermission";

export type SaveRecordPermissionInput = {
  readonly configText: string;
};

export async function saveRecordPermission({
  container,
  input,
}: RecordPermissionServiceArgs<SaveRecordPermissionInput>): Promise<void> {
  await container.recordPermissionStorage.update(input.configText);
}
