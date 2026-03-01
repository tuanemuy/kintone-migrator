import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import type { ServiceArgs } from "../types";

export type ReportDiffContainer = {
  reportConfigurator: ReportConfigurator;
  reportStorage: ReportStorage;
};

export type ReportContainer = ReportDiffContainer & {
  appDeployer: AppDeployer;
};

export type ReportDiffServiceArgs<T = undefined> = ServiceArgs<
  ReportDiffContainer,
  T
>;

export type ReportServiceArgs<T = undefined> = ServiceArgs<ReportContainer, T>;
