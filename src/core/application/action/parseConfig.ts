import type { ActionsConfig } from "@/core/domain/action/entity";
import { ActionConfigParser } from "@/core/domain/action/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseActionConfigText(rawText: string): ActionsConfig {
  const parsed = parseYamlText(rawText, "Action");
  return wrapBusinessRuleError(() => ActionConfigParser.parse(parsed));
}
