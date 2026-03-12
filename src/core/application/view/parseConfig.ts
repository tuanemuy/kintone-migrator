import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ViewsConfig } from "@/core/domain/view/entity";
import { ViewConfigParser } from "@/core/domain/view/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseViewConfigText(
  codec: ConfigCodec,
  rawText: string,
): ViewsConfig {
  const parsed = parseYamlText(codec, rawText, "View");
  return wrapBusinessRuleError(() => ViewConfigParser.parse(parsed));
}
