import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { NotificationConfigurator } from "@/core/domain/notification/ports/notificationConfigurator";
import type { NotificationStateStorage } from "@/core/domain/notification/ports/notificationStateStorage";
import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type NotificationDiffContainer = {
  configCodec: ConfigCodec;
  notificationConfigurator: NotificationConfigurator;
  notificationStorage: NotificationStorage;
  // Base snapshot storage for 3-way diff/pull/push (ADR-188-001).
  notificationStateStorage: NotificationStateStorage;
  // App-scoped base revision storage (shared across domains, ADR-188-001).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place (ADR-188-007).
  appRevisionReader: AppRevisionReader;
};

export type NotificationContainer = NotificationDiffContainer & {
  appDeployer: AppDeployer;
};

export type NotificationDiffServiceArgs<T = undefined> = ServiceArgs<
  NotificationDiffContainer,
  T
>;

export type NotificationServiceArgs<T = undefined> = ServiceArgs<
  NotificationContainer,
  T
>;
