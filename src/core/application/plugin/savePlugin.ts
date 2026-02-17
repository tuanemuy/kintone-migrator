import type { PluginServiceArgs } from "../container/plugin";

export type SavePluginInput = {
  readonly configText: string;
};

export async function savePlugin({
  container,
  input,
}: PluginServiceArgs<SavePluginInput>): Promise<void> {
  await container.pluginStorage.update(input.configText);
}
