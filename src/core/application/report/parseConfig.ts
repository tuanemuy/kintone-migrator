import type { ReportsConfig } from "@/core/domain/report/entity";
import { ReportConfigParser } from "@/core/domain/report/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseYamlText } from "../parseYamlText";

export function parseReportConfigText(rawText: string): ReportsConfig {
  const parsed = parseYamlText(rawText, "Report");
  return wrapBusinessRuleError(() => ReportConfigParser.parse(parsed));
}
