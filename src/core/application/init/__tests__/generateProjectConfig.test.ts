import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import type { SpaceApp } from "@/core/domain/space/entity";
import { generateProjectConfig } from "../generateProjectConfig";

describe("generateProjectConfig", () => {
  it("有効なYAMLを生成する", () => {
    const apps: SpaceApp[] = [{ appId: "1", code: "myapp", name: "My App" }];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(parsed).toBeDefined();
    expect(parsed.domain).toBe("example.cybozu.com");
  });

  it("codeをアプリ名として使用する", () => {
    const apps: SpaceApp[] = [{ appId: "1", code: "myapp", name: "My App" }];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(parsed.apps.myapp).toBeDefined();
    expect(parsed.apps.myapp.appId).toBe("1");
    expect(parsed.apps.myapp.files.schema).toBe("myapp/schema.yaml");
  });

  it("codeが空の場合、アプリ名を使用する", () => {
    const apps: SpaceApp[] = [{ appId: "42", code: "", name: "No Code App" }];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(parsed.apps["No Code App"]).toBeDefined();
    expect(parsed.apps["No Code App"].appId).toBe("42");
    expect(parsed.apps["No Code App"].files.schema).toBe(
      "No Code App/schema.yaml",
    );
  });

  it("codeとnameが両方空の場合、app-{appId}をフォールバックとして使用する", () => {
    const apps: SpaceApp[] = [{ appId: "42", code: "", name: "" }];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(parsed.apps["app-42"]).toBeDefined();
    expect(parsed.apps["app-42"].appId).toBe("42");
    expect(parsed.apps["app-42"].files.schema).toBe("app-42/schema.yaml");
  });

  it("複数アプリの設定を生成する", () => {
    const apps: SpaceApp[] = [
      { appId: "1", code: "app1", name: "App 1" },
      { appId: "2", code: "app2", name: "App 2" },
      { appId: "3", code: "", name: "App 3" },
    ];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(Object.keys(parsed.apps)).toHaveLength(3);
    expect(parsed.apps.app1).toBeDefined();
    expect(parsed.apps.app2).toBeDefined();
    expect(parsed.apps["App 3"]).toBeDefined();
  });

  it("filesオブジェクトに全ドメインのファイルパスを含む", () => {
    const apps: SpaceApp[] = [{ appId: "1", code: "myapp", name: "My App" }];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    const files = parsed.apps.myapp.files;
    expect(files.schema).toBe("myapp/schema.yaml");
    expect(files.seed).toBe("myapp/seed.yaml");
    expect(files.customize).toBe("myapp/customize.yaml");
    expect(files.view).toBe("myapp/view.yaml");
    expect(files.settings).toBe("myapp/settings.yaml");
    expect(files.notification).toBe("myapp/notification.yaml");
    expect(files.report).toBe("myapp/report.yaml");
    expect(files.action).toBe("myapp/action.yaml");
    expect(files.process).toBe("myapp/process.yaml");
    expect(files.fieldAcl).toBe("myapp/field-acl.yaml");
    expect(files.appAcl).toBe("myapp/app-acl.yaml");
    expect(files.recordAcl).toBe("myapp/record-acl.yaml");
    expect(files.adminNotes).toBe("myapp/admin-notes.yaml");
    expect(files.plugin).toBe("myapp/plugin.yaml");
  });

  it("guestSpaceIdが指定された場合、設定に含める", () => {
    const apps: SpaceApp[] = [{ appId: "1", code: "myapp", name: "My App" }];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
      guestSpaceId: "5",
    });

    const parsed = parseYaml(result);
    expect(parsed.guestSpaceId).toBe("5");
  });

  it("guestSpaceIdが未指定の場合、設定に含めない", () => {
    const apps: SpaceApp[] = [{ appId: "1", code: "myapp", name: "My App" }];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(parsed.guestSpaceId).toBeUndefined();
  });

  it("同じcodeのアプリが2つある場合、2つ目に-2サフィックスを付与する", () => {
    const apps: SpaceApp[] = [
      { appId: "1", code: "myapp", name: "App 1" },
      { appId: "2", code: "myapp", name: "App 2" },
    ];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(parsed.apps.myapp).toBeDefined();
    expect(parsed.apps.myapp.appId).toBe("1");
    expect(parsed.apps["myapp-2"]).toBeDefined();
    expect(parsed.apps["myapp-2"].appId).toBe("2");
    expect(parsed.apps["myapp-2"].files.schema).toBe("myapp-2/schema.yaml");
  });

  it("生成された設定にauthフィールドが含まれない", () => {
    const apps: SpaceApp[] = [{ appId: "1", code: "myapp", name: "My App" }];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(parsed.auth).toBeUndefined();
  });

  it("同じcodeのアプリが3つある場合、-2と-3サフィックスを付与する", () => {
    const apps: SpaceApp[] = [
      { appId: "1", code: "dup", name: "Dup 1" },
      { appId: "2", code: "dup", name: "Dup 2" },
      { appId: "3", code: "dup", name: "Dup 3" },
    ];

    const result = generateProjectConfig({
      apps,
      domain: "example.cybozu.com",
    });

    const parsed = parseYaml(result);
    expect(parsed.apps.dup).toBeDefined();
    expect(parsed.apps.dup.appId).toBe("1");
    expect(parsed.apps["dup-2"]).toBeDefined();
    expect(parsed.apps["dup-2"].appId).toBe("2");
    expect(parsed.apps["dup-3"]).toBeDefined();
    expect(parsed.apps["dup-3"].appId).toBe("3");
  });
});
