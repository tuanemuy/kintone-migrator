import { PluginConfigSerializer } from "@/core/domain/plugin/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { PluginServiceArgs } from "../container/plugin";
import { stringifyConfig } from "../stringifyConfig";

export type CapturePluginOutput = CaptureOutput;

export async function capturePlugin({
  container,
}: PluginServiceArgs): Promise<CapturePluginOutput> {
  return captureFromConfig({
    fetchRemote: () => container.pluginConfigurator.getPlugins(),
    serialize: ({ plugins }) =>
      stringifyConfig(
        container.configCodec,
        PluginConfigSerializer.serialize({ plugins }),
      ),
    getStorage: () => container.pluginStorage.get(),
  });
}
