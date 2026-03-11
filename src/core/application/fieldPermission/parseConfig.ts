import type { FieldPermissionConfig } from "@/core/domain/fieldPermission/entity";
import { FieldPermissionConfigParser } from "@/core/domain/fieldPermission/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseFieldPermissionConfigText(
  rawText: string,
): FieldPermissionConfig {
  const parsed = parseYamlText(rawText, "Field permission");
  return wrapBusinessRuleError(() => FieldPermissionConfigParser.parse(parsed));
}
