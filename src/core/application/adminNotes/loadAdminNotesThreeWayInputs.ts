import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesStateParser } from "@/core/domain/adminNotes/services/adminNotesStateParser";
import type { AdminNotesDiffContainer } from "../container/adminNotes";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseAdminNotesConfigText } from "./parseConfig";

/** Remote admin notes config carrying the revision it was observed at. */
export type AdminNotesRemote = Readonly<{
  config: AdminNotesConfig;
  revision: string;
}>;

export type AdminNotesThreeWayInputs = ThreeWayInputs<
  AdminNotesConfig,
  AdminNotesRemote
>;

/**
 * Loads the four inputs of a 3-way admin notes sync (base snapshot, base app
 * revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. Admin notes is a single (whole-entity) config
 * domain; the remote is fetched with a single getter carrying its own revision.
 */
export async function loadAdminNotesThreeWayInputs(
  container: AdminNotesDiffContainer,
): Promise<AdminNotesThreeWayInputs> {
  return loadThreeWayInputs<AdminNotesConfig, AdminNotesRemote>({
    codec: container.configCodec,
    stateStorage: container.adminNotesStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => AdminNotesStateParser.parse(parsed).config,
    stateLabel: "Admin notes state",
    loadLocal: async () => {
      const result = await container.adminNotesStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseAdminNotesConfigText(container.configCodec, result.content);
    },
    loadRemote: async () => {
      const { config, revision } =
        await container.adminNotesConfigurator.getAdminNotes();
      return { config, revision };
    },
  });
}
