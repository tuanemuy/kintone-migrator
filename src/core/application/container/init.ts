import type { ProjectConfigStorage } from "@/core/domain/projectConfig/ports/projectConfigStorage";
import type { SpaceReader } from "@/core/domain/space/ports/spaceReader";

export type InitContainer = {
  spaceReader: SpaceReader;
  projectConfigStorage: ProjectConfigStorage;
};
