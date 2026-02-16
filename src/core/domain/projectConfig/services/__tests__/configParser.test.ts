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
});
