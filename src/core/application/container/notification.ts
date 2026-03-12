import type { NotificationConfigurator } from "@/core/domain/notification/ports/notificationConfigurator";
import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type NotificationDiffContainer = {
  configCodec: ConfigCodec;
  notificationConfigurator: NotificationConfigurator;
  notificationStorage: NotificationStorage;
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
