import type { AppPermissionServiceArgs } from "../container/appPermission";

export type SaveAppPermissionInput = {
  readonly configText: string;
};

export async function saveAppPermission({
  container,
  input,
}: AppPermissionServiceArgs<SaveAppPermissionInput>): Promise<void> {
  await container.appPermissionStorage.update(input.configText);
}
