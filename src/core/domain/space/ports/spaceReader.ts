import type { SpaceApp } from "../entity";

export interface SpaceReader {
  getSpaceApps(spaceId: string): Promise<readonly SpaceApp[]>;
}
