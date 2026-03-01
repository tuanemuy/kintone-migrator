import type { ActionConfigurator } from "@/core/domain/action/ports/actionConfigurator";
import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type ActionDiffContainer = {
  actionConfigurator: ActionConfigurator;
  actionStorage: ActionStorage;
};

export type ActionContainer = ActionDiffContainer & {
  appDeployer: AppDeployer;
};

export type ActionDiffServiceArgs<T = undefined> = ServiceArgs<
  ActionDiffContainer,
  T
>;

export type ActionServiceArgs<T = undefined> = ServiceArgs<ActionContainer, T>;
