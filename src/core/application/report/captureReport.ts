import { ReportConfigSerializer } from "@/core/domain/report/services/configSerializer";
import type { ReportServiceArgs } from "../container/report";

export type CaptureReportOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureReport({
  container,
}: ReportServiceArgs): Promise<CaptureReportOutput> {
  const { reports } = await container.reportConfigurator.getReports();

  const configText = ReportConfigSerializer.serialize({ reports });
  const existing = await container.reportStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
