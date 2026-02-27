import { ReportDiffDetector } from "@/core/domain/report/services/diffDetector";
import type { ReportDiff } from "@/core/domain/report/valueObject";
import type { ReportServiceArgs } from "../container/report";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseReportConfigText } from "./parseConfig";

export async function detectReportDiff({
  container,
}: ReportServiceArgs): Promise<ReportDiff> {
  const result = await container.reportStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Report config file not found",
    );
  }
  const localConfig = parseReportConfigText(result.content);

  const { reports: remoteReports } =
    await container.reportConfigurator.getReports();

  return ReportDiffDetector.detect(localConfig, { reports: remoteReports });
}
