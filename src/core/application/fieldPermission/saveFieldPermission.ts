import type { FieldPermissionServiceArgs } from "../container/fieldPermission";

export type SaveFieldPermissionInput = {
  readonly configText: string;
};

export async function saveFieldPermission({
  container,
  input,
}: FieldPermissionServiceArgs<SaveFieldPermissionInput>): Promise<void> {
  await container.fieldPermissionStorage.update(input.configText);
}
