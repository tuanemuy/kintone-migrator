import { describe, expect, it } from "vitest";
import { NotFoundError } from "@/core/application/error";
import type { AppInfo } from "@/core/domain/app/entity";
import type { AppLister } from "@/core/domain/app/ports/appLister";
import { fetchAllApps } from "../fetchAllApps";

class InMemoryAppLister implements AppLister {
  private apps: readonly AppInfo[] = [];

  setApps(apps: readonly AppInfo[]): void {
    this.apps = apps;
  }

  async getAllApps(): Promise<readonly AppInfo[]> {
    return this.apps;
  }
}

describe("fetchAllApps", () => {
  it("全アプリ一覧を返す", async () => {
    const lister = new InMemoryAppLister();
    const apps: AppInfo[] = [
      { appId: "1", code: "app1", name: "App 1" },
      { appId: "2", code: "app2", name: "App 2" },
    ];
    lister.setApps(apps);

    const result = await fetchAllApps({
      container: { appLister: lister },
    });

    expect(result).toEqual(apps);
    expect(result).toHaveLength(2);
  });

  it("アプリが0件の場合、NotFoundErrorをスローする", async () => {
    const lister = new InMemoryAppLister();
    lister.setApps([]);

    await expect(
      fetchAllApps({
        container: { appLister: lister },
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("アプリが1件の場合でも正常に返す", async () => {
    const lister = new InMemoryAppLister();
    lister.setApps([{ appId: "1", code: "single", name: "Single App" }]);

    const result = await fetchAllApps({
      container: { appLister: lister },
    });

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("single");
  });
});
