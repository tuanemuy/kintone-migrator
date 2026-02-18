import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesConfigParser } from "@/core/domain/adminNotes/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseAdminNotesConfigText(rawText: string): AdminNotesConfig {
  return wrapBusinessRuleError(() => AdminNotesConfigParser.parse(rawText));
}
