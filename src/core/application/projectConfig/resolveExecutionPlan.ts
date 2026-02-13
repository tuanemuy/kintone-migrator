import type {
  AppEntry,
  ExecutionPlan,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { resolveExecutionOrder } from "@/core/domain/projectConfig/services/dependencyResolver";
import { AppName } from "@/core/domain/projectConfig/valueObject";
import { NotFoundError, NotFoundErrorCode } from "../error";

export type ResolveExecutionPlanInput = Readonly<{
  config: ProjectConfig;
  appName?: string;
  all?: boolean;
}>;

export function resolveExecutionPlan(
  input: ResolveExecutionPlanInput,
): ExecutionPlan {
  const { config, appName, all } = input;

  if (appName) {
    return resolveSingleApp(config, appName);
  }

  if (all) {
    return resolveExecutionOrder(config.apps);
  }

  throw new Error(
    "Unreachable: CLI layer must ensure at least one mode (appName or all) is selected",
  );
}

function resolveSingleApp(
  config: ProjectConfig,
  appName: string,
): ExecutionPlan {
  const name = AppName.create(appName);
  const entry: AppEntry | undefined = config.apps.get(name);

  if (!entry) {
    throw new NotFoundError(
      NotFoundErrorCode.AppNotFound,
      `App "${appName}" not found in project config`,
    );
  }

  return { orderedApps: [entry] };
}
