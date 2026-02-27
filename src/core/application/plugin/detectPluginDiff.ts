import { PluginDiffDetector } from "@/core/domain/plugin/services/diffDetector";
import type { PluginDiff } from "@/core/domain/plugin/valueObject";
import type { PluginServiceArgs } from "../container/plugin";
import { ValidationError, ValidationErrorCode } from "../error";
import { parsePluginConfigText } from "./parseConfig";

export async function detectPluginDiff({
  container,
}: PluginServiceArgs): Promise<PluginDiff> {
  const result = await container.pluginStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Plugin config file not found",
    );
  }
  const localConfig = parsePluginConfigText(result.content);

  const { plugins: remotePlugins } =
    await container.pluginConfigurator.getPlugins();

  return PluginDiffDetector.detect(localConfig, { plugins: remotePlugins });
}
