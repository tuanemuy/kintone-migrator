import type { AdminNotesStateStorage } from "@/core/domain/adminNotes/ports/adminNotesStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileAdminNotesStateStorage(
  filePath: string,
): AdminNotesStateStorage {
  return createLocalFileStorage(filePath, "admin notes state file");
}
