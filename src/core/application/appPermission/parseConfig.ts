import type { AppPermissionConfig } from "@/core/domain/appPermission/entity";
import { AppPermissionConfigParser } from "@/core/domain/appPermission/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseAppPermissionConfigText(
  rawText: string,
): AppPermissionConfig {
  const parsed = parseYamlText(rawText, "App permission");
  return wrapBusinessRuleError(() => AppPermissionConfigParser.parse(parsed));
}
