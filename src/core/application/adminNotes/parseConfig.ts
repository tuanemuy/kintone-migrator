import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesConfigParser } from "@/core/domain/adminNotes/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseAdminNotesConfigText(rawText: string): AdminNotesConfig {
  const parsed = parseYamlText(rawText, "Admin notes");
  return wrapBusinessRuleError(() => AdminNotesConfigParser.parse(parsed));
}
