import { applyFromConfig } from "../applyFromConfigBase";
import type { ActionServiceArgs } from "../container/action";
import { parseActionConfigText } from "./parseConfig";

export async function applyAction({
  container,
}: ActionServiceArgs): Promise<void> {
  await applyFromConfig({
    getStorage: () => container.actionStorage.get(),
    parseConfig: (content) =>
      parseActionConfigText(container.configCodec, content),
    fetchRemote: () => container.actionConfigurator.getActions(),
    update: async (config, current) => {
      await container.actionConfigurator.updateActions({
        actions: config.actions,
        revision: current.revision,
      });
    },
    notFoundMessage: "Action config file not found",
  });
}
