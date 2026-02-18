import type { ActionConfigurator } from "@/core/domain/action/ports/actionConfigurator";
import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type ActionContainer = {
  actionConfigurator: ActionConfigurator;
  actionStorage: ActionStorage;
  appDeployer: AppDeployer;
};

export type ActionServiceArgs<T = undefined> = ServiceArgs<ActionContainer, T>;
