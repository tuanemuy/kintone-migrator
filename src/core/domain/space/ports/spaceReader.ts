import type { AppInfo } from "@/core/domain/app/entity";

export interface SpaceReader {
  getSpaceApps(spaceId: string): Promise<readonly AppInfo[]>;
}
