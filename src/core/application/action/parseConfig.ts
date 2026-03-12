import type { ActionsConfig } from "@/core/domain/action/entity";
import { ActionConfigParser } from "@/core/domain/action/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";

export function parseActionConfigText(
  codec: ConfigCodec,
  rawText: string,
): ActionsConfig {
  const parsed = parseConfigText(codec, rawText, "Action");
  return wrapBusinessRuleError(() => ActionConfigParser.parse(parsed));
}
