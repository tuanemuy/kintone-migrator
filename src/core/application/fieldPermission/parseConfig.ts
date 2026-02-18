import type { FieldPermissionConfig } from "@/core/domain/fieldPermission/entity";
import { FieldPermissionConfigParser } from "@/core/domain/fieldPermission/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseFieldPermissionConfigText(
  rawText: string,
): FieldPermissionConfig {
  return wrapBusinessRuleError(() =>
    FieldPermissionConfigParser.parse(rawText),
  );
}
