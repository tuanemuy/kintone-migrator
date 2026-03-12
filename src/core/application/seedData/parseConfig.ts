import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { SeedData } from "@/core/domain/seedData/entity";
import { SeedParser } from "@/core/domain/seedData/services/seedParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseSeedText(codec: ConfigCodec, rawText: string): SeedData {
  const parsed = parseYamlText(codec, rawText, "Seed");
  return wrapBusinessRuleError(() => SeedParser.parse(parsed));
}
