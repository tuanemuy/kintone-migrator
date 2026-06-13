import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";
import type { ReportStateStorage } from "@/core/domain/report/ports/reportStateStorage";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import type { ServiceArgs } from "../types";

export type ReportDiffContainer = {
  configCodec: ConfigCodec;
  reportConfigurator: ReportConfigurator;
  reportStorage: ReportStorage;
  // Base snapshot storage for 3-way diff/pull/push (ADR-188-001).
  reportStateStorage: ReportStateStorage;
  // App-scoped base revision storage (shared across domains, ADR-188-001).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place (ADR-188-007).
  appRevisionReader: AppRevisionReader;
};

export type ReportContainer = ReportDiffContainer & {
  appDeployer: AppDeployer;
};

export type ReportDiffServiceArgs<T = undefined> = ServiceArgs<
  ReportDiffContainer,
  T
>;

export type ReportServiceArgs<T = undefined> = ServiceArgs<ReportContainer, T>;
