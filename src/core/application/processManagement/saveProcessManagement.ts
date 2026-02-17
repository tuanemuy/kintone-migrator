import type { ProcessManagementServiceArgs } from "../container/processManagement";

export type SaveProcessManagementInput = {
  readonly configText: string;
};

export async function saveProcessManagement({
  container,
  input,
}: ProcessManagementServiceArgs<SaveProcessManagementInput>): Promise<void> {
  await container.processManagementStorage.update(input.configText);
}
