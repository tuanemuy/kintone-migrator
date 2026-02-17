import type { AdminNotesServiceArgs } from "../container/adminNotes";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseAdminNotesConfigText } from "./parseConfig";

export async function applyAdminNotes({
  container,
}: AdminNotesServiceArgs): Promise<void> {
  const result = await container.adminNotesStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Admin notes config file not found",
    );
  }
  const config = parseAdminNotesConfigText(result.content);

  const current = await container.adminNotesConfigurator.getAdminNotes();

  await container.adminNotesConfigurator.updateAdminNotes({
    config,
    revision: current.revision,
  });
}
