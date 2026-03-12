import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ReportsConfig } from "@/core/domain/report/entity";
import { ReportConfigParser } from "@/core/domain/report/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseReportConfigText(
  codec: ConfigCodec,
  rawText: string,
): ReportsConfig {
  const parsed = parseYamlText(codec, rawText, "Report");
  return wrapBusinessRuleError(() => ReportConfigParser.parse(parsed));
}
