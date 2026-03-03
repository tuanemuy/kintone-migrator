import { applyFromConfig } from "../applyFromConfigBase";
import type { ReportServiceArgs } from "../container/report";
import { parseReportConfigText } from "./parseConfig";

export async function applyReport({
  container,
}: ReportServiceArgs): Promise<void> {
  await applyFromConfig({
    getStorage: () => container.reportStorage.get(),
    parseConfig: parseReportConfigText,
    fetchRemote: () => container.reportConfigurator.getReports(),
    update: async (config, current) => {
      await container.reportConfigurator.updateReports({
        reports: config.reports,
        revision: current.revision,
      });
    },
    notFoundMessage: "Report config file not found",
  });
}
