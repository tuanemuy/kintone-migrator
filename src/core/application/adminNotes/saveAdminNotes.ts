import type { AdminNotesServiceArgs } from "../container/adminNotes";

export type SaveAdminNotesInput = {
  readonly configText: string;
};

export async function saveAdminNotes({
  container,
  input,
}: AdminNotesServiceArgs<SaveAdminNotesInput>): Promise<void> {
  await container.adminNotesStorage.update(input.configText);
}
