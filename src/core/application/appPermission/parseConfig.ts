import type { AppPermissionConfig } from "@/core/domain/appPermission/entity";
import { AppPermissionConfigParser } from "@/core/domain/appPermission/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseAppPermissionConfigText(
  rawText: string,
): AppPermissionConfig {
  return wrapBusinessRuleError(() => AppPermissionConfigParser.parse(rawText));
}
