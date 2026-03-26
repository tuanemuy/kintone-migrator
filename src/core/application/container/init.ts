import type { AppLister } from "@/core/domain/app/ports/appLister";
import type { ProjectConfigStorage } from "@/core/domain/projectConfig/ports/projectConfigStorage";
import type { SpaceReader } from "@/core/domain/space/ports/spaceReader";

export type InitContainer = {
  spaceReader: SpaceReader;
  appLister: AppLister;
  projectConfigStorage: ProjectConfigStorage;
};
