import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileAdminNotesStorage
  extends LocalFileStorage
  implements AdminNotesStorage {}
