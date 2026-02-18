import { describe, expect, it } from "vitest";
import { resolveAppName, type SpaceApp } from "../entity";

describe("resolveAppName", () => {
  it("codeが空でない場合、codeを返す", () => {
    const app: SpaceApp = { appId: "1", code: "myapp", name: "My App" };
    expect(resolveAppName(app)).toBe("myapp");
  });

  it("codeが空文字の場合、app-{appId}を返す", () => {
    const app: SpaceApp = { appId: "42", code: "", name: "My App" };
    expect(resolveAppName(app)).toBe("app-42");
  });

  it("ファイルシステムに不正な文字をアンダースコアに置換する", () => {
    const app: SpaceApp = {
      appId: "1",
      code: 'my<app>:name"test',
      name: "My App",
    };
    expect(resolveAppName(app)).toBe("my_app__name_test");
  });

  it("末尾のドットを除去する", () => {
    const app: SpaceApp = { appId: "1", code: "myapp...", name: "My App" };
    expect(resolveAppName(app)).toBe("myapp");
  });
});
