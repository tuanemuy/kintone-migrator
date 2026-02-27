import { AdminNotesDiffDetector } from "@/core/domain/adminNotes/services/diffDetector";
import type { AdminNotesDiff } from "@/core/domain/adminNotes/valueObject";
import type { AdminNotesServiceArgs } from "../container/adminNotes";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseAdminNotesConfigText } from "./parseConfig";

export async function detectAdminNotesDiff({
  container,
}: AdminNotesServiceArgs): Promise<AdminNotesDiff> {
  const result = await container.adminNotesStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Admin notes config file not found",
    );
  }
  const localConfig = parseAdminNotesConfigText(result.content);

  const { config: remoteConfig } =
    await container.adminNotesConfigurator.getAdminNotes();

  return AdminNotesDiffDetector.detect(localConfig, remoteConfig);
}
