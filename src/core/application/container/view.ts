import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";
import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";
import type { ServiceArgs } from "../types";

export type ViewContainer = {
  viewConfigurator: ViewConfigurator;
  viewStorage: ViewStorage;
  appDeployer: AppDeployer;
};

export type ViewServiceArgs<T = undefined> = ServiceArgs<ViewContainer, T>;
