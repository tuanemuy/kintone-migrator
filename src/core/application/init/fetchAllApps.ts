import type { AppLister } from "@/core/domain/app/ports/appLister";
import type { SpaceApp } from "@/core/domain/space/entity";
import { NotFoundError, NotFoundErrorCode } from "../error";

export type FetchAllAppsContainer = Readonly<{
  appLister: AppLister;
}>;

export async function fetchAllApps(args: {
  container: FetchAllAppsContainer;
}): Promise<readonly SpaceApp[]> {
  const apps = await args.container.appLister.getAllApps();

  if (apps.length === 0) {
    throw new NotFoundError(
      NotFoundErrorCode.NotFound,
      "No apps found. Please check your API token permissions.",
    );
  }

  return apps;
}
