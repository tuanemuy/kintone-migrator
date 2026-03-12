import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementConfigParser } from "@/core/domain/processManagement/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";

export function parseProcessManagementConfigText(
  codec: ConfigCodec,
  rawText: string,
): ProcessManagementConfig {
  const parsed = parseConfigText(codec, rawText, "Process management");
  return wrapBusinessRuleError(() =>
    ProcessManagementConfigParser.parse(parsed),
  );
}
