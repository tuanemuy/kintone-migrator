import type { RecordPermissionConfig } from "@/core/domain/recordPermission/entity";
import { RecordPermissionConfigParser } from "@/core/domain/recordPermission/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseRecordPermissionConfigText(
  rawText: string,
): RecordPermissionConfig {
  const parsed = parseYamlText(rawText, "Record permission");
  return wrapBusinessRuleError(() =>
    RecordPermissionConfigParser.parse(parsed),
  );
}
