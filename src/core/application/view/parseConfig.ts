import type { ViewsConfig } from "@/core/domain/view/entity";
import { ViewConfigParser } from "@/core/domain/view/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseViewConfigText(rawText: string): ViewsConfig {
  const parsed = parseYamlText(rawText, "View");
  return wrapBusinessRuleError(() => ViewConfigParser.parse(parsed));
}
