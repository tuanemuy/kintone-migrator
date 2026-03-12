import type { BusinessRuleErrorCode } from "@/core/domain/error";
import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";

export function validateParsedConfig(
  parsed: unknown,
  invalidConfigStructure: BusinessRuleErrorCode,
  domainLabel: string,
): Record<string, unknown> {
  if (!isRecord(parsed)) {
    throw new BusinessRuleError(
      invalidConfigStructure,
      `${domainLabel} config must be an object`,
    );
  }

  return parsed;
}
