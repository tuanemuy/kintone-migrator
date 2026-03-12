import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { RecordPermissionConfig } from "@/core/domain/recordPermission/entity";
import { RecordPermissionConfigParser } from "@/core/domain/recordPermission/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseRecordPermissionConfigText(
  codec: ConfigCodec,
  rawText: string,
): RecordPermissionConfig {
  const parsed = parseYamlText(codec, rawText, "Record permission");
  return wrapBusinessRuleError(() =>
    RecordPermissionConfigParser.parse(parsed),
  );
}
