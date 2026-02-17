import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";
import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";

export type ViewContainer = {
  viewConfigurator: ViewConfigurator;
  viewStorage: ViewStorage;
  appDeployer: AppDeployer;
};

export type ViewServiceArgs<T = undefined> = T extends undefined
  ? { container: ViewContainer }
  : { container: ViewContainer; input: T };
