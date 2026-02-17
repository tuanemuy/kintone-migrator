import { isBusinessRuleError } from "@/core/domain/error";
import type { ReportsConfig } from "@/core/domain/report/entity";
import { ReportConfigParser } from "@/core/domain/report/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseReportConfigText(rawText: string): ReportsConfig {
  try {
    return ReportConfigParser.parse(rawText);
  } catch (error) {
    if (isBusinessRuleError(error)) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        error.message,
        error,
      );
    }
    throw error;
  }
}
