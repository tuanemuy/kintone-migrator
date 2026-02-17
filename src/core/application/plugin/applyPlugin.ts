import type { PluginServiceArgs } from "../container/plugin";
import { ValidationError, ValidationErrorCode } from "../error";
import { parsePluginConfigText } from "./parseConfig";

export async function applyPlugin({
  container,
}: PluginServiceArgs): Promise<void> {
  const result = await container.pluginStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Plugin config file not found",
    );
  }
  const config = parsePluginConfigText(result.content);

  const current = await container.pluginConfigurator.getPlugins();

  const currentIds = new Set(current.plugins.map((p) => p.id));
  const desiredIds = config.plugins.map((p) => p.id);
  const missingIds = desiredIds.filter((id) => !currentIds.has(id));

  if (missingIds.length > 0) {
    await container.pluginConfigurator.addPlugins({
      ids: missingIds,
      revision: current.revision,
    });
  }
}
