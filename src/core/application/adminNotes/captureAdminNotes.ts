import { AdminNotesConfigSerializer } from "@/core/domain/adminNotes/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { AdminNotesServiceArgs } from "../container/adminNotes";
import { stringifyToYaml } from "../stringifyToYaml";

export type CaptureAdminNotesOutput = CaptureOutput;

export async function captureAdminNotes({
  container,
}: AdminNotesServiceArgs): Promise<CaptureAdminNotesOutput> {
  return captureFromConfig({
    fetchRemote: () => container.adminNotesConfigurator.getAdminNotes(),
    serialize: ({ config }) =>
      stringifyToYaml(
        container.configCodec,
        AdminNotesConfigSerializer.serialize(config),
      ),
    getStorage: () => container.adminNotesStorage.get(),
  });
}
