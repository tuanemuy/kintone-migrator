import type { NotificationConfigurator } from "@/core/domain/notification/ports/notificationConfigurator";
import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type NotificationContainer = {
  notificationConfigurator: NotificationConfigurator;
  notificationStorage: NotificationStorage;
  appDeployer: AppDeployer;
};

export type NotificationServiceArgs<T = undefined> = ServiceArgs<
  NotificationContainer,
  T
>;
