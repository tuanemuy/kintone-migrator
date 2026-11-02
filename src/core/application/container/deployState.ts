import type { AppRevisionGenerationsReader } from "@/core/domain/appRevision/ports/appRevisionGenerationsReader";
import type { ServiceArgs } from "../types";

export type DeployStateContainer = {
  appRevisionGenerationsReader: AppRevisionGenerationsReader;
};

export type DeployStateServiceArgs<T = undefined> = ServiceArgs<
  DeployStateContainer,
  T
>;
