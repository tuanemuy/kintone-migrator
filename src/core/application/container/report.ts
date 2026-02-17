import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";

export type ReportContainer = {
  reportConfigurator: ReportConfigurator;
  reportStorage: ReportStorage;
  appDeployer: AppDeployer;
};

export type ReportServiceArgs<T = undefined> = T extends undefined
  ? { container: ReportContainer }
  : { container: ReportContainer; input: T };
