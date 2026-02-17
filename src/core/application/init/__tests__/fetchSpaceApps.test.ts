import { describe, expect, it } from "vitest";
import { ValidationError } from "@/core/application/error";
import type { SpaceApp } from "@/core/domain/space/entity";
import type { SpaceReader } from "@/core/domain/space/ports/spaceReader";
import { fetchSpaceApps } from "../fetchSpaceApps";

class InMemorySpaceReader implements SpaceReader {
  private apps: readonly SpaceApp[] = [];

  setApps(apps: readonly SpaceApp[]): void {
    this.apps = apps;
  }

  async getSpaceApps(_spaceId: string): Promise<readonly SpaceApp[]> {
    return this.apps;
  }
}

describe("fetchSpaceApps", () => {
  it("スペースに属するアプリ一覧を返す", async () => {
    const reader = new InMemorySpaceReader();
    const apps: SpaceApp[] = [
      { appId: "1", code: "app1", name: "App 1" },
      { appId: "2", code: "app2", name: "App 2" },
    ];
    reader.setApps(apps);

    const result = await fetchSpaceApps({
      spaceReader: reader,
      spaceId: "space-1",
    });

    expect(result).toEqual(apps);
    expect(result).toHaveLength(2);
  });

  it("アプリが0件の場合、ValidationErrorをスローする", async () => {
    const reader = new InMemorySpaceReader();
    reader.setApps([]);

    await expect(
      fetchSpaceApps({ spaceReader: reader, spaceId: "empty-space" }),
    ).rejects.toThrow(ValidationError);
  });

  it("アプリが1件の場合でも正常に返す", async () => {
    const reader = new InMemorySpaceReader();
    reader.setApps([{ appId: "1", code: "single", name: "Single App" }]);

    const result = await fetchSpaceApps({
      spaceReader: reader,
      spaceId: "space-1",
    });

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("single");
  });
});
