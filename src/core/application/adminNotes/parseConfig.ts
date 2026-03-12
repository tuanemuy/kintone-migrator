import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesConfigParser } from "@/core/domain/adminNotes/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseAdminNotesConfigText(
  codec: ConfigCodec,
  rawText: string,
): AdminNotesConfig {
  const parsed = parseYamlText(codec, rawText, "Admin notes");
  return wrapBusinessRuleError(() => AdminNotesConfigParser.parse(parsed));
}
