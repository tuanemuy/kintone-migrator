import { isBusinessRuleError } from "@/core/domain/error";
import type { PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginConfigParser } from "@/core/domain/plugin/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parsePluginConfigText(rawText: string): PluginsConfig {
  try {
    return PluginConfigParser.parse(rawText);
  } catch (error) {
    if (isBusinessRuleError(error)) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        error.message,
        error,
      );
    }
    throw error;
  }
}
