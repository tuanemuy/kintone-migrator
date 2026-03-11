import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigParser } from "@/core/domain/customization/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseConfigText(rawText: string): CustomizationConfig {
  const parsed = parseYamlText(rawText, "Customization");
  return wrapBusinessRuleError(() => CustomizationConfigParser.parse(parsed));
}
