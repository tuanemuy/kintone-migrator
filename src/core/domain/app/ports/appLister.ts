import type { AppInfo } from "../entity";

export interface AppLister {
  getAllApps(): Promise<readonly AppInfo[]>;
}
