import { applyFromConfig } from "../applyFromConfigBase";
import type { AdminNotesServiceArgs } from "../container/adminNotes";
import { parseAdminNotesConfigText } from "./parseConfig";

export async function applyAdminNotes({
  container,
}: AdminNotesServiceArgs): Promise<void> {
  await applyFromConfig({
    getStorage: () => container.adminNotesStorage.get(),
    parseConfig: (content) =>
      parseAdminNotesConfigText(container.configCodec, content),
    fetchRemote: () => container.adminNotesConfigurator.getAdminNotes(),
    update: async (config, current) => {
      await container.adminNotesConfigurator.updateAdminNotes({
        config,
        revision: current.revision,
      });
    },
    notFoundMessage: "Admin notes config file not found",
  });
}
