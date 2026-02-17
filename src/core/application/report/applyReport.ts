import type { ReportServiceArgs } from "../container/report";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseReportConfigText } from "./parseConfig";

export async function applyReport({
  container,
}: ReportServiceArgs): Promise<void> {
  const result = await container.reportStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Report config file not found",
    );
  }
  const config = parseReportConfigText(result.content);

  const current = await container.reportConfigurator.getReports();

  await container.reportConfigurator.updateReports({
    reports: config.reports,
    revision: current.revision,
  });
}
