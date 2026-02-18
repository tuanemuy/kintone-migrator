import { describe, expect, it } from "vitest";
import {
  createTestActionContainer,
  createTestAdminNotesContainer,
  createTestAppPermissionContainer,
  createTestContainer,
  createTestCustomizationContainer,
  createTestFieldPermissionContainer,
  createTestGeneralSettingsContainer,
  createTestNotificationContainer,
  createTestPluginContainer,
  createTestProcessManagementContainer,
  createTestRecordPermissionContainer,
  createTestReportContainer,
  createTestSeedContainer,
  createTestViewContainer,
} from "@/core/application/__tests__/helpers";
import type { CaptureAllContainers } from "@/core/application/container/captureAll";
import {
  ForbiddenError,
  ForbiddenErrorCode,
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
  UnauthenticatedErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import { captureAllForApp, isFatalError } from "../captureAllForApp";

function createMockContainers(): CaptureAllContainers {
  return {
    schema: createTestContainer(),
    seed: createTestSeedContainer(),
    customization: createTestCustomizationContainer(),
    view: createTestViewContainer(),
    settings: createTestGeneralSettingsContainer(),
    notification: createTestNotificationContainer(),
    report: createTestReportContainer(),
    action: createTestActionContainer(),
    process: createTestProcessManagementContainer(),
    fieldPermission: createTestFieldPermissionContainer(),
    appPermission: createTestAppPermissionContainer(),
    recordPermission: createTestRecordPermissionContainer(),
    adminNotes: createTestAdminNotesContainer(),
    plugin: createTestPluginContainer(),
  };
}

describe("isFatalError", () => {
  it("UnauthenticatedError を致命的と判定する", () => {
    const error = new UnauthenticatedError(
      UnauthenticatedErrorCode.InvalidCredentials,
      "Invalid credentials",
    );
    expect(isFatalError(error)).toBe(true);
  });

  it("ForbiddenError を致命的と判定する", () => {
    const error = new ForbiddenError(
      ForbiddenErrorCode.InsufficientPermissions,
      "Forbidden",
    );
    expect(isFatalError(error)).toBe(true);
  });

  it("SystemError(NetworkError) を致命的と判定する", () => {
    const error = new SystemError(
      SystemErrorCode.NetworkError,
      "Network error",
    );
    expect(isFatalError(error)).toBe(true);
  });

  it("SystemError(ExternalApiError) は致命的と判定しない", () => {
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "API error",
    );
    expect(isFatalError(error)).toBe(false);
  });

  it("SystemError(StorageError) は致命的と判定しない", () => {
    const error = new SystemError(
      SystemErrorCode.StorageError,
      "Storage error",
    );
    expect(isFatalError(error)).toBe(false);
  });

  it("ValidationError は致命的と判定しない", () => {
    const error = new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Validation error",
    );
    expect(isFatalError(error)).toBe(false);
  });

  it("通常の Error は致命的と判定しない", () => {
    const error = new Error("generic error");
    expect(isFatalError(error)).toBe(false);
  });

  it("null は致命的と判定しない", () => {
    expect(isFatalError(null)).toBe(false);
  });
});

describe("captureAllForApp", () => {
  const baseInput = {
    appName: "test-app",
    customizeBasePath: "apps/test-app",
  };

  it("全14ドメインが成功する", async () => {
    const results = await captureAllForApp({
      container: createMockContainers(),
      input: baseInput,
    });

    expect(results).toHaveLength(14);
    for (const result of results) {
      expect(result.success).toBe(true);
    }

    const domains = results.map((r) => r.domain);
    expect(domains).toEqual([
      "customize",
      "schema",
      "seed",
      "view",
      "settings",
      "notification",
      "report",
      "action",
      "process",
      "field-acl",
      "app-acl",
      "record-acl",
      "admin-notes",
      "plugin",
    ]);
  });

  it("非致命的エラーでは後続ドメインが継続する", async () => {
    const containers = createMockContainers();

    // Make schema fail with a non-fatal error
    const schemaContainer = containers.schema;
    schemaContainer.formConfigurator.getFields = () => {
      throw new SystemError(SystemErrorCode.ExternalApiError, "API error");
    };

    const results = await captureAllForApp({
      container: containers,
      input: baseInput,
    });

    expect(results).toHaveLength(14);
    const schemaResult = results.find((r) => r.domain === "schema");
    expect(schemaResult?.success).toBe(false);

    // Other domains should still succeed
    const successCount = results.filter((r) => r.success).length;
    expect(successCount).toBe(13);
  });

  it("致命的エラー (UnauthenticatedError) で残りがskipされる", async () => {
    const containers = createMockContainers();

    // Make the first domain (customize) fail with UnauthenticatedError
    containers.customization.customizationStorage.get = () => {
      throw new UnauthenticatedError(
        UnauthenticatedErrorCode.InvalidCredentials,
        "Invalid credentials",
      );
    };

    const results = await captureAllForApp({
      container: containers,
      input: baseInput,
    });

    expect(results).toHaveLength(14);
    // First fails
    expect(results[0].domain).toBe("customize");
    expect(results[0].success).toBe(false);
    // All remaining are also marked as failed
    for (const result of results.slice(1)) {
      expect(result.success).toBe(false);
    }
  });

  it("致命的エラー (NetworkError) で残りがskipされる", async () => {
    const containers = createMockContainers();

    // Make schema (second domain) fail with NetworkError
    containers.schema.formConfigurator.getFields = () => {
      throw new SystemError(SystemErrorCode.NetworkError, "Network error");
    };

    const results = await captureAllForApp({
      container: containers,
      input: baseInput,
    });

    expect(results).toHaveLength(14);
    // customize succeeds
    expect(results[0].domain).toBe("customize");
    expect(results[0].success).toBe(true);
    // schema fails
    expect(results[1].domain).toBe("schema");
    expect(results[1].success).toBe(false);
    // All remaining are marked as failed
    for (const result of results.slice(2)) {
      expect(result.success).toBe(false);
    }
  });
});
