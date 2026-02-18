import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { ConfigParser } from "@/core/domain/customization/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseConfigText(rawText: string): CustomizationConfig {
  return wrapBusinessRuleError(() => ConfigParser.parse(rawText));
}
