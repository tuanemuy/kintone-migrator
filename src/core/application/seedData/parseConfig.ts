import type { SeedData } from "@/core/domain/seedData/entity";
import { SeedParser } from "@/core/domain/seedData/services/seedParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseSeedText(rawText: string): SeedData {
  const parsed = parseYamlText(rawText, "Seed");
  return wrapBusinessRuleError(() => SeedParser.parse(parsed));
}
