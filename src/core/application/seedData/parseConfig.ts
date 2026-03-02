import type { SeedData } from "@/core/domain/seedData/entity";
import { SeedParser } from "@/core/domain/seedData/services/seedParser";
import { wrapBusinessRuleError } from "../error";

export function parseSeedText(rawText: string): SeedData {
  return wrapBusinessRuleError(() => SeedParser.parse(rawText));
}
