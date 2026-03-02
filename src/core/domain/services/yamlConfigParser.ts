import { parse as parseYaml } from "yaml";
import type { BusinessRuleErrorCode } from "@/core/domain/error";
import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";

type YamlConfigErrorCodes = {
  emptyConfigText: BusinessRuleErrorCode;
  invalidConfigYaml: BusinessRuleErrorCode;
  invalidConfigStructure: BusinessRuleErrorCode;
};

export function parseYamlConfig(
  rawText: string,
  errorCodes: YamlConfigErrorCodes,
  domainLabel: string,
): Record<string, unknown> {
  if (rawText.trim().length === 0) {
    throw new BusinessRuleError(
      errorCodes.emptyConfigText,
      `${domainLabel} config text is empty`,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(rawText);
  } catch (error) {
    throw new BusinessRuleError(
      errorCodes.invalidConfigYaml,
      `Failed to parse ${domainLabel} YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!isRecord(parsed)) {
    throw new BusinessRuleError(
      errorCodes.invalidConfigStructure,
      `${domainLabel} config must be a YAML object`,
    );
  }

  return parsed;
}
