import { PluginConfigSerializer } from "@/core/domain/plugin/services/configSerializer";
import type { PluginServiceArgs } from "../container/plugin";

export type CapturePluginOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function capturePlugin({
  container,
}: PluginServiceArgs): Promise<CapturePluginOutput> {
  const { plugins } = await container.pluginConfigurator.getPlugins();

  const configText = PluginConfigSerializer.serialize({ plugins });
  const existing = await container.pluginStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
