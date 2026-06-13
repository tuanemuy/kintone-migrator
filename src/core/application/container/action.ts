import type { ActionConfigurator } from "@/core/domain/action/ports/actionConfigurator";
import type { ActionStateStorage } from "@/core/domain/action/ports/actionStateStorage";
import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type ActionDiffContainer = {
  configCodec: ConfigCodec;
  actionConfigurator: ActionConfigurator;
  actionStorage: ActionStorage;
  // Base snapshot storage for 3-way diff/pull/push (ADR-188-001).
  actionStateStorage: ActionStateStorage;
  // App-scoped base revision storage (shared across domains, ADR-188-001).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place (ADR-188-007).
  appRevisionReader: AppRevisionReader;
};

export type ActionContainer = ActionDiffContainer & {
  appDeployer: AppDeployer;
};

export type ActionDiffServiceArgs<T = undefined> = ServiceArgs<
  ActionDiffContainer,
  T
>;

export type ActionServiceArgs<T = undefined> = ServiceArgs<ActionContainer, T>;
