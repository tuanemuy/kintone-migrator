import type { ActionsConfig } from "@/core/domain/action/entity";
import { ActionConfigParser } from "@/core/domain/action/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseActionConfigText(rawText: string): ActionsConfig {
  return wrapBusinessRuleError(() => ActionConfigParser.parse(rawText));
}
