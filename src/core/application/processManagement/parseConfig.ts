import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementConfigParser } from "@/core/domain/processManagement/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseProcessManagementConfigText(
  rawText: string,
): ProcessManagementConfig {
  return wrapBusinessRuleError(() =>
    ProcessManagementConfigParser.parse(rawText),
  );
}
