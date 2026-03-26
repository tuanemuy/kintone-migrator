import type { SpaceApp } from "../../space/entity";

export interface AppLister {
  getAllApps(): Promise<readonly SpaceApp[]>;
}
