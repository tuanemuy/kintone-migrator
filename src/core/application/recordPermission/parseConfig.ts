import type { RecordPermissionConfig } from "@/core/domain/recordPermission/entity";
import { RecordPermissionConfigParser } from "@/core/domain/recordPermission/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseRecordPermissionConfigText(
  rawText: string,
): RecordPermissionConfig {
  return wrapBusinessRuleError(() =>
    RecordPermissionConfigParser.parse(rawText),
  );
}
