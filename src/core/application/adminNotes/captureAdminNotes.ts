import { AdminNotesConfigSerializer } from "@/core/domain/adminNotes/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { AdminNotesServiceArgs } from "../container/adminNotes";

export type CaptureAdminNotesOutput = CaptureOutput;

export async function captureAdminNotes({
  container,
}: AdminNotesServiceArgs): Promise<CaptureAdminNotesOutput> {
  return captureFromConfig({
    fetchRemote: () => container.adminNotesConfigurator.getAdminNotes(),
    serialize: ({ config }) => AdminNotesConfigSerializer.serialize(config),
    getStorage: () => container.adminNotesStorage.get(),
  });
}
