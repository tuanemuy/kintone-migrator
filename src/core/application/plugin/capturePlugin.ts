import { PluginConfigSerializer } from "@/core/domain/plugin/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { PluginServiceArgs } from "../container/plugin";

export type CapturePluginOutput = CaptureOutput;

export async function capturePlugin({
  container,
}: PluginServiceArgs): Promise<CapturePluginOutput> {
  return captureFromConfig({
    fetchRemote: () => container.pluginConfigurator.getPlugins(),
    serialize: ({ plugins }) => PluginConfigSerializer.serialize({ plugins }),
    getStorage: () => container.pluginStorage.get(),
  });
}
