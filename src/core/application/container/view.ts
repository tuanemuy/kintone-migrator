import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";
import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";
import type { ServiceArgs } from "../types";

export type ViewDiffContainer = {
  viewConfigurator: ViewConfigurator;
  viewStorage: ViewStorage;
};

export type ViewContainer = ViewDiffContainer & {
  appDeployer: AppDeployer;
};

export type ViewDiffServiceArgs<T = undefined> = ServiceArgs<
  ViewDiffContainer,
  T
>;

export type ViewServiceArgs<T = undefined> = ServiceArgs<ViewContainer, T>;
