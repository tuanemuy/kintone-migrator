import type { ViewServiceArgs } from "../container/view";

export type SaveViewInput = {
  readonly configText: string;
};

export async function saveView({
  container,
  input,
}: ViewServiceArgs<SaveViewInput>): Promise<void> {
  await container.viewStorage.update(input.configText);
}
