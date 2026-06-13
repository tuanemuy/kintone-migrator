import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";
import type { ViewStateStorage } from "@/core/domain/view/ports/viewStateStorage";
import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";
import type { ServiceArgs } from "../types";

export type ViewDiffContainer = {
  configCodec: ConfigCodec;
  viewConfigurator: ViewConfigurator;
  viewStorage: ViewStorage;
  // Base snapshot storage for 3-way diff/pull/push (ADR-188-001).
  viewStateStorage: ViewStateStorage;
  // App-scoped base revision storage (shared across domains, ADR-188-001).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place (ADR-188-007).
  appRevisionReader: AppRevisionReader;
};

export type ViewContainer = ViewDiffContainer & {
  appDeployer: AppDeployer;
};

export type ViewDiffServiceArgs<T = undefined> = ServiceArgs<
  ViewDiffContainer,
  T
>;

export type ViewServiceArgs<T = undefined> = ServiceArgs<ViewContainer, T>;
