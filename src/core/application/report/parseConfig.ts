import type { ReportsConfig } from "@/core/domain/report/entity";
import { ReportConfigParser } from "@/core/domain/report/services/configParser";
import { wrapBusinessRuleError } from "../error";

export function parseReportConfigText(rawText: string): ReportsConfig {
  return wrapBusinessRuleError(() => ReportConfigParser.parse(rawText));
}
