import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import { createEmptyStorage } from "./storage";

export const emptyAdminNotesStorage: AdminNotesStorage = createEmptyStorage(
  "EmptyAdminNotesStorage",
);
