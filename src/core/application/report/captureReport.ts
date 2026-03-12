import { ReportConfigSerializer } from "@/core/domain/report/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { ReportServiceArgs } from "../container/report";
import { stringifyConfig } from "../stringifyConfig";

export type CaptureReportOutput = CaptureOutput;

export async function captureReport({
  container,
}: ReportServiceArgs): Promise<CaptureReportOutput> {
  return captureFromConfig({
    fetchRemote: () => container.reportConfigurator.getReports(),
    serialize: ({ reports }) =>
      stringifyConfig(
        container.configCodec,
        ReportConfigSerializer.serialize({ reports }),
      ),
    getStorage: () => container.reportStorage.get(),
  });
}
