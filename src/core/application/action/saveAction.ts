import type { ActionServiceArgs } from "../container/action";

export type SaveActionInput = {
  readonly configText: string;
};

export async function saveAction({
  container,
  input,
}: ActionServiceArgs<SaveActionInput>): Promise<void> {
  await container.actionStorage.update(input.configText);
}
