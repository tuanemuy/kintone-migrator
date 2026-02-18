import type { ViewsConfig } from "@/core/domain/view/entity";
import { ViewConfigParser } from "@/core/domain/view/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseViewConfigText(rawText: string): ViewsConfig {
  return wrapBusinessRuleError(() => ViewConfigParser.parse(rawText));
}
