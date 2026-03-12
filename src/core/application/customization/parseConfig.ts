import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigParser } from "@/core/domain/customization/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseConfigText(
  codec: ConfigCodec,
  rawText: string,
): CustomizationConfig {
  const parsed = parseYamlText(codec, rawText, "Customization");
  return wrapBusinessRuleError(() => CustomizationConfigParser.parse(parsed));
}
