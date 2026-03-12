import type { AppPermissionConfig } from "@/core/domain/appPermission/entity";
import { AppPermissionConfigParser } from "@/core/domain/appPermission/services/configParser";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseAppPermissionConfigText(
  codec: ConfigCodec,
  rawText: string,
): AppPermissionConfig {
  const parsed = parseYamlText(codec, rawText, "App permission");
  return wrapBusinessRuleError(() => AppPermissionConfigParser.parse(parsed));
}
