import type { FieldPermissionConfig } from "@/core/domain/fieldPermission/entity";
import { FieldPermissionConfigParser } from "@/core/domain/fieldPermission/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseFieldPermissionConfigText(
  codec: ConfigCodec,
  rawText: string,
): FieldPermissionConfig {
  const parsed = parseYamlText(codec, rawText, "Field permission");
  return wrapBusinessRuleError(() => FieldPermissionConfigParser.parse(parsed));
}
