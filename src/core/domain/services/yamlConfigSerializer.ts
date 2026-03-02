import { stringify as stringifyYaml } from "yaml";
import { BusinessRuleError, BusinessRuleErrorCode } from "@/core/domain/error";

export function serializeToYaml(data: Record<string, unknown>): string {
  try {
    return stringifyYaml(data, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  } catch (error) {
    throw new BusinessRuleError(
      BusinessRuleErrorCode.AcInvalidConfigStructure,
      `Failed to serialize config to YAML: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }
}
