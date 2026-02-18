import { BusinessRuleError } from "@/core/domain/error";
import type { AppEntry, AuthConfig, ProjectConfig } from "../entity";
import { ProjectConfigErrorCode } from "../errorCode";
import { AppName } from "../valueObject";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const v of value) {
    if (typeof v !== "string") {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.InvalidConfigStructure,
        `Array element must be a string, got ${typeof v}`,
      );
    }
  }
  return value as string[];
}

type FilePathFields = Pick<
  AppEntry,
  | "schemaFile"
  | "seedFile"
  | "customizeFile"
  | "fieldAclFile"
  | "viewFile"
  | "appAclFile"
  | "recordAclFile"
  | "processFile"
  | "settingsFile"
  | "notificationFile"
  | "reportFile"
  | "actionFile"
  | "adminNotesFile"
  | "pluginFile"
>;

/** Merge `files` object and flat fields into resolved file path fields. `files` takes precedence. */
function resolveFilePathFields(
  filesObj: unknown,
  rawApp: Record<string, unknown>,
): FilePathFields {
  const f = isRecord(filesObj) ? filesObj : {};
  return {
    schemaFile:
      asOptionalString(f.schema) ?? asOptionalString(rawApp.schemaFile),
    seedFile: asOptionalString(f.seed) ?? asOptionalString(rawApp.seedFile),
    customizeFile:
      asOptionalString(f.customize) ?? asOptionalString(rawApp.customizeFile),
    fieldAclFile:
      asOptionalString(f.fieldAcl) ?? asOptionalString(rawApp.fieldAclFile),
    viewFile: asOptionalString(f.view) ?? asOptionalString(rawApp.viewFile),
    appAclFile:
      asOptionalString(f.appAcl) ?? asOptionalString(rawApp.appAclFile),
    recordAclFile:
      asOptionalString(f.recordAcl) ?? asOptionalString(rawApp.recordAclFile),
    processFile:
      asOptionalString(f.process) ?? asOptionalString(rawApp.processFile),
    settingsFile:
      asOptionalString(f.settings) ?? asOptionalString(rawApp.settingsFile),
    notificationFile:
      asOptionalString(f.notification) ??
      asOptionalString(rawApp.notificationFile),
    reportFile:
      asOptionalString(f.report) ?? asOptionalString(rawApp.reportFile),
    actionFile:
      asOptionalString(f.action) ?? asOptionalString(rawApp.actionFile),
    adminNotesFile:
      asOptionalString(f.adminNotes) ?? asOptionalString(rawApp.adminNotesFile),
    pluginFile:
      asOptionalString(f.plugin) ?? asOptionalString(rawApp.pluginFile),
  };
}

function parseProjectConfig(raw: unknown): ProjectConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProjectConfigErrorCode.InvalidConfigStructure,
      "Project config must be an object",
    );
  }

  const rawApps = raw.apps;

  if (!isRecord(rawApps) || Object.keys(rawApps).length === 0) {
    throw new BusinessRuleError(
      ProjectConfigErrorCode.EmptyApps,
      "Project config must have at least one app defined in 'apps'",
    );
  }

  const topLevelDomain = asOptionalString(raw.domain);
  const topLevelGuestSpaceId = asOptionalString(raw.guestSpaceId);

  if (raw.auth !== undefined && !isRecord(raw.auth)) {
    throw new BusinessRuleError(
      ProjectConfigErrorCode.InvalidAuthConfig,
      "Top-level auth must be an object",
    );
  }
  const topLevelAuth = parseAuth(isRecord(raw.auth) ? raw.auth : undefined);

  const apps = new Map<AppName, AppEntry>();

  for (const [name, rawAppValue] of Object.entries(rawApps)) {
    if (!isRecord(rawAppValue)) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.InvalidConfigStructure,
        `App "${name}" must be an object`,
      );
    }

    const appId = asOptionalString(rawAppValue.appId);
    if (!appId || appId.trim().length === 0) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.EmptyAppId,
        `App "${name}" must have a non-empty appId`,
      );
    }

    if (rawAppValue.auth !== undefined && !isRecord(rawAppValue.auth)) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.InvalidAuthConfig,
        `App "${name}" auth must be an object`,
      );
    }
    const appAuth = parseAuth(
      isRecord(rawAppValue.auth) ? rawAppValue.auth : undefined,
    );
    const appDomain = asOptionalString(rawAppValue.domain);

    const appName = AppName.create(name);
    const dependsOn = (asOptionalStringArray(rawAppValue.dependsOn) ?? []).map(
      AppName.create,
    );

    const filePaths = resolveFilePathFields(rawAppValue.files, rawAppValue);

    apps.set(appName, {
      name: appName,
      appId,
      ...filePaths,
      domain: appDomain,
      auth: appAuth,
      guestSpaceId: asOptionalString(rawAppValue.guestSpaceId),
      dependsOn,
    });
  }

  return {
    domain: topLevelDomain,
    auth: topLevelAuth,
    guestSpaceId: topLevelGuestSpaceId,
    apps,
  };
}

function parseAuth(
  raw: Record<string, unknown> | undefined,
): AuthConfig | undefined {
  if (!raw) return undefined;

  const apiToken = asOptionalString(raw.apiToken);
  if (apiToken !== undefined) {
    if (apiToken.trim().length === 0) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.InvalidAuthConfig,
        "apiToken must not be empty",
      );
    }
    return { type: "apiToken", apiToken };
  }

  const username = asOptionalString(raw.username);
  const password = asOptionalString(raw.password);
  if (username !== undefined && password !== undefined) {
    if (username.trim().length === 0 || password.trim().length === 0) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.InvalidAuthConfig,
        "username and password must not be empty",
      );
    }
    return { type: "password", username, password };
  }

  throw new BusinessRuleError(
    ProjectConfigErrorCode.InvalidAuthConfig,
    "Auth must have either apiToken or username/password",
  );
}

export const ConfigParser = {
  parse: parseProjectConfig,
};
