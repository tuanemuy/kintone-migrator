import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileAdminNotesStorage(
  filePath: string,
): AdminNotesStorage {
  return createLocalFileStorage(filePath, "admin notes file");
}
