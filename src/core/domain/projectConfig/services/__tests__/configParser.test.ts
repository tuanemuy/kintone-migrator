import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import { ProjectConfigErrorCode } from "../../errorCode";
import { AppName } from "../../valueObject";
import { ConfigParser } from "../configParser";

describe("ConfigParser.parse", () => {
  it("parses a valid minimal config", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { apiToken: "test-token" },
      apps: {
        customer: {
          appId: "10",
        },
      },
    });

    expect(config.domain).toBe("example.cybozu.com");
    expect(config.auth).toEqual({ type: "apiToken", apiToken: "test-token" });
    expect(config.apps.size).toBe(1);

    const customer = config.apps.get(AppName.create("customer"));
    expect(customer).toBeDefined();
    expect(customer?.appId).toBe("10");
    expect(customer?.schemaFile).toBe("schemas/customer.yaml");
    expect(customer?.dependsOn).toEqual([]);
  });

  it("parses config with multiple apps and dependencies", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { apiToken: "token" },
      apps: {
        customer: { appId: "10" },
        order: { appId: "20", dependsOn: ["customer"] },
        invoice: {
          appId: "30",
          dependsOn: ["order", "customer"],
          schemaFile: "custom/invoice.yaml",
        },
      },
    });

    expect(config.apps.size).toBe(3);

    const order = config.apps.get(AppName.create("order"));
    expect(order?.dependsOn).toEqual(["customer"]);

    const invoice = config.apps.get(AppName.create("invoice"));
    expect(invoice?.dependsOn).toEqual(["order", "customer"]);
    expect(invoice?.schemaFile).toBe("custom/invoice.yaml");
  });

  it("parses config with password auth", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { username: "user", password: "pass" },
      apps: {
        app1: { appId: "1" },
      },
    });

    expect(config.auth).toEqual({
      type: "password",
      username: "user",
      password: "pass",
    });
  });

  it("parses config with per-app overrides", () => {
    const config = ConfigParser.parse({
      domain: "default.cybozu.com",
      auth: { apiToken: "default-token" },
      apps: {
        app1: {
          appId: "1",
          domain: "other.cybozu.com",
          auth: { apiToken: "app-specific-token" },
          guestSpaceId: "123",
        },
      },
    });

    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.domain).toBe("other.cybozu.com");
    expect(app1?.auth).toEqual({
      type: "apiToken",
      apiToken: "app-specific-token",
    });
    expect(app1?.guestSpaceId).toBe("123");
  });

  it("parses guestSpaceId at top level", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { apiToken: "token" },
      guestSpaceId: "456",
      apps: {
        app1: { appId: "1" },
      },
    });

    expect(config.guestSpaceId).toBe("456");
  });

  it("throws when raw input is not an object", () => {
    for (const input of ["string", 42, null, true, [1, 2]]) {
      try {
        ConfigParser.parse(input);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
        if (isBusinessRuleError(error)) {
          expect(error.code).toBe(ProjectConfigErrorCode.EmptyApps);
        }
      }
    }
  });

  it("throws EmptyApps when apps is missing", () => {
    try {
      ConfigParser.parse({ domain: "x", auth: { apiToken: "t" } });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(ProjectConfigErrorCode.EmptyApps);
      }
    }
  });

  it("throws EmptyApps when apps is empty object", () => {
    try {
      ConfigParser.parse({
        domain: "x",
        auth: { apiToken: "t" },
        apps: {},
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(ProjectConfigErrorCode.EmptyApps);
      }
    }
  });

  it("throws EmptyAppId when appId is missing", () => {
    try {
      ConfigParser.parse({
        domain: "x",
        auth: { apiToken: "t" },
        apps: { app1: {} },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(ProjectConfigErrorCode.EmptyAppId);
      }
    }
  });

  it("throws EmptyAppId when appId is empty string", () => {
    try {
      ConfigParser.parse({
        domain: "x",
        auth: { apiToken: "t" },
        apps: { app1: { appId: "" } },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(ProjectConfigErrorCode.EmptyAppId);
      }
    }
  });

  it("parses config without domain (domain can be resolved via env vars later)", () => {
    const config = ConfigParser.parse({
      auth: { apiToken: "t" },
      apps: { app1: { appId: "1" } },
    });

    expect(config.domain).toBeUndefined();
    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.domain).toBeUndefined();
    expect(app1?.appId).toBe("1");
  });

  it("parses config without auth (auth can be resolved via env vars later)", () => {
    const config = ConfigParser.parse({
      domain: "x",
      apps: { app1: { appId: "1" } },
    });

    expect(config.auth).toBeUndefined();
    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.auth).toBeUndefined();
    expect(app1?.appId).toBe("1");
  });

  it("uses app-level domain when top-level is missing", () => {
    const config = ConfigParser.parse({
      auth: { apiToken: "t" },
      apps: {
        app1: { appId: "1", domain: "app.cybozu.com" },
      },
    });

    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.domain).toBe("app.cybozu.com");
  });

  it("uses app-level auth when top-level is missing", () => {
    const config = ConfigParser.parse({
      domain: "x",
      apps: {
        app1: { appId: "1", auth: { apiToken: "app-token" } },
      },
    });

    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.auth).toEqual({ type: "apiToken", apiToken: "app-token" });
  });

  it("全ドメインのファイルパスオーバーライドをパースする", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { apiToken: "token" },
      apps: {
        app1: {
          appId: "1",
          customizeFile: "custom/customize.yaml",
          fieldAclFile: "custom/field-acl.yaml",
          viewFile: "custom/view.yaml",
          appAclFile: "custom/app-acl.yaml",
          recordAclFile: "custom/record-acl.yaml",
          processFile: "custom/process.yaml",
          settingsFile: "custom/settings.yaml",
          notificationFile: "custom/notification.yaml",
          reportFile: "custom/report.yaml",
          actionFile: "custom/action.yaml",
          adminNotesFile: "custom/admin-notes.yaml",
          pluginFile: "custom/plugin.yaml",
        },
      },
    });

    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.customizeFile).toBe("custom/customize.yaml");
    expect(app1?.fieldAclFile).toBe("custom/field-acl.yaml");
    expect(app1?.viewFile).toBe("custom/view.yaml");
    expect(app1?.appAclFile).toBe("custom/app-acl.yaml");
    expect(app1?.recordAclFile).toBe("custom/record-acl.yaml");
    expect(app1?.processFile).toBe("custom/process.yaml");
    expect(app1?.settingsFile).toBe("custom/settings.yaml");
    expect(app1?.notificationFile).toBe("custom/notification.yaml");
    expect(app1?.reportFile).toBe("custom/report.yaml");
    expect(app1?.actionFile).toBe("custom/action.yaml");
    expect(app1?.adminNotesFile).toBe("custom/admin-notes.yaml");
    expect(app1?.pluginFile).toBe("custom/plugin.yaml");
  });

  it("filesオブジェクト形式で全ファイルパスフィールドをパースする", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { apiToken: "token" },
      apps: {
        app1: {
          appId: "1",
          files: {
            schema: "f/schema.yaml",
            seed: "f/seed.yaml",
            customize: "f/customize.yaml",
            fieldAcl: "f/field-acl.yaml",
            view: "f/view.yaml",
            appAcl: "f/app-acl.yaml",
            recordAcl: "f/record-acl.yaml",
            process: "f/process.yaml",
            settings: "f/settings.yaml",
            notification: "f/notification.yaml",
            report: "f/report.yaml",
            action: "f/action.yaml",
            adminNotes: "f/admin-notes.yaml",
            plugin: "f/plugin.yaml",
          },
        },
      },
    });

    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.schemaFile).toBe("f/schema.yaml");
    expect(app1?.seedFile).toBe("f/seed.yaml");
    expect(app1?.customizeFile).toBe("f/customize.yaml");
    expect(app1?.fieldAclFile).toBe("f/field-acl.yaml");
    expect(app1?.viewFile).toBe("f/view.yaml");
    expect(app1?.appAclFile).toBe("f/app-acl.yaml");
    expect(app1?.recordAclFile).toBe("f/record-acl.yaml");
    expect(app1?.processFile).toBe("f/process.yaml");
    expect(app1?.settingsFile).toBe("f/settings.yaml");
    expect(app1?.notificationFile).toBe("f/notification.yaml");
    expect(app1?.reportFile).toBe("f/report.yaml");
    expect(app1?.actionFile).toBe("f/action.yaml");
    expect(app1?.adminNotesFile).toBe("f/admin-notes.yaml");
    expect(app1?.pluginFile).toBe("f/plugin.yaml");
  });

  it("filesオブジェクトがフラットフィールドより優先される", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { apiToken: "token" },
      apps: {
        app1: {
          appId: "1",
          schemaFile: "flat/schema.yaml",
          seedFile: "flat/seed.yaml",
          customizeFile: "flat/customize.yaml",
          files: {
            schema: "files/schema.yaml",
            seed: "files/seed.yaml",
            customize: "files/customize.yaml",
          },
        },
      },
    });

    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.schemaFile).toBe("files/schema.yaml");
    expect(app1?.seedFile).toBe("files/seed.yaml");
    expect(app1?.customizeFile).toBe("files/customize.yaml");
  });

  it("filesオブジェクトの部分指定は指定されたフィールドのみ上書きする", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { apiToken: "token" },
      apps: {
        app1: {
          appId: "1",
          schemaFile: "flat/schema.yaml",
          customizeFile: "flat/customize.yaml",
          files: {
            schema: "files/schema.yaml",
          },
        },
      },
    });

    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.schemaFile).toBe("files/schema.yaml");
    expect(app1?.seedFile).toBe("seeds/app1.yaml");
    expect(app1?.customizeFile).toBe("flat/customize.yaml");
    expect(app1?.viewFile).toBe("view/app1.yaml");
  });

  it("未指定のドメインファイルパスフィールドは規約ベースのデフォルト値になる", () => {
    const config = ConfigParser.parse({
      domain: "example.cybozu.com",
      auth: { apiToken: "token" },
      apps: {
        app1: { appId: "1" },
      },
    });

    const app1 = config.apps.get(AppName.create("app1"));
    expect(app1?.customizeFile).toBe("customize/app1.yaml");
    expect(app1?.fieldAclFile).toBe("field-acl/app1.yaml");
    expect(app1?.viewFile).toBe("view/app1.yaml");
    expect(app1?.appAclFile).toBe("app-acl/app1.yaml");
    expect(app1?.recordAclFile).toBe("record-acl/app1.yaml");
    expect(app1?.processFile).toBe("process/app1.yaml");
    expect(app1?.settingsFile).toBe("settings/app1.yaml");
    expect(app1?.notificationFile).toBe("notification/app1.yaml");
    expect(app1?.reportFile).toBe("report/app1.yaml");
    expect(app1?.actionFile).toBe("action/app1.yaml");
    expect(app1?.adminNotesFile).toBe("admin-notes/app1.yaml");
    expect(app1?.pluginFile).toBe("plugin/app1.yaml");
  });
});
