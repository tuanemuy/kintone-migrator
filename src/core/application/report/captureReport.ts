import { ReportConfigSerializer } from "@/core/domain/report/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { ReportServiceArgs } from "../container/report";
import { stringifyToYaml } from "../stringifyToYaml";

export type CaptureReportOutput = CaptureOutput;

export async function captureReport({
  container,
}: ReportServiceArgs): Promise<CaptureReportOutput> {
  return captureFromConfig({
    fetchRemote: () => container.reportConfigurator.getReports(),
    serialize: ({ reports }) =>
      stringifyToYaml(ReportConfigSerializer.serialize({ reports })),
    getStorage: () => container.reportStorage.get(),
  });
}
