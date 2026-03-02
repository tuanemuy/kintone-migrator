import { stringify as stringifyYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import { DomainServiceErrorCode } from "./errorCode";

export function serializeToYaml(data: Record<string, unknown>): string {
  try {
    return stringifyYaml(data, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  } catch (error) {
    throw new BusinessRuleError(
      DomainServiceErrorCode.YamlSerializationFailed,
      `Failed to serialize config to YAML: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }
}
