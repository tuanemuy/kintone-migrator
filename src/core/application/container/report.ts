import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import type { ServiceArgs } from "../types";

export type ReportDiffContainer = {
  configCodec: ConfigCodec;
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
