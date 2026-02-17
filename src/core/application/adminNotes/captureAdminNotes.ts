import { AdminNotesConfigSerializer } from "@/core/domain/adminNotes/services/configSerializer";
import type { AdminNotesServiceArgs } from "../container/adminNotes";

export type CaptureAdminNotesOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureAdminNotes({
  container,
}: AdminNotesServiceArgs): Promise<CaptureAdminNotesOutput> {
  const { config } = await container.adminNotesConfigurator.getAdminNotes();

  const configText = AdminNotesConfigSerializer.serialize(config);
  const existing = await container.adminNotesStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
