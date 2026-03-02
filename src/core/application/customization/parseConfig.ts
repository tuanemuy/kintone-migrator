import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigParser } from "@/core/domain/customization/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseConfigText(rawText: string): CustomizationConfig {
  return wrapBusinessRuleError(() => CustomizationConfigParser.parse(rawText));
}
