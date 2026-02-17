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
  return Array.isArray(value)
    ? value.filter((v) => typeof v === "string")
    : undefined;
}

type ParsedFiles = {
  schemaFile?: string;
  seedFile?: string;
  customizeFile?: string;
  fieldAclFile?: string;
  viewFile?: string;
  appAclFile?: string;
  recordAclFile?: string;
  processFile?: string;
  settingsFile?: string;
  notificationFile?: string;
  reportFile?: string;
  actionFile?: string;
  adminNotesFile?: string;
  pluginFile?: string;
};

function parseFiles(raw: unknown): ParsedFiles {
  if (!isRecord(raw)) return {};
  return {
    schemaFile: asOptionalString(raw.schema),
    seedFile: asOptionalString(raw.seed),
    customizeFile: asOptionalString(raw.customize),
    fieldAclFile: asOptionalString(raw.fieldAcl),
    viewFile: asOptionalString(raw.view),
    appAclFile: asOptionalString(raw.appAcl),
    recordAclFile: asOptionalString(raw.recordAcl),
    processFile: asOptionalString(raw.process),
    settingsFile: asOptionalString(raw.settings),
    notificationFile: asOptionalString(raw.notification),
    reportFile: asOptionalString(raw.report),
    actionFile: asOptionalString(raw.action),
    adminNotesFile: asOptionalString(raw.adminNotes),
    pluginFile: asOptionalString(raw.plugin),
  };
}

function parseProjectConfig(raw: unknown): ProjectConfig {
  if (!isRecord(raw)) {
    throw new BusinessRuleError(
      ProjectConfigErrorCode.EmptyApps,
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
  const topLevelAuth = parseAuth(isRecord(raw.auth) ? raw.auth : undefined);

  const apps = new Map<AppName, AppEntry>();

  for (const [name, rawAppValue] of Object.entries(rawApps)) {
    if (!isRecord(rawAppValue)) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.EmptyAppId,
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

    const appAuth = parseAuth(
      isRecord(rawAppValue.auth) ? rawAppValue.auth : undefined,
    );
    const appDomain = asOptionalString(rawAppValue.domain);

    const appName = AppName.create(name);
    const dependsOn = (asOptionalStringArray(rawAppValue.dependsOn) ?? []).map(
      AppName.create,
    );

    const files = parseFiles(rawAppValue.files);

    apps.set(appName, {
      name: appName,
      appId,
      schemaFile:
        files.schemaFile ??
        asOptionalString(rawAppValue.schemaFile) ??
        `schemas/${name}.yaml`,
      seedFile:
        files.seedFile ??
        asOptionalString(rawAppValue.seedFile) ??
        `seeds/${name}.yaml`,
      customizeFile:
        files.customizeFile ?? asOptionalString(rawAppValue.customizeFile),
      fieldAclFile:
        files.fieldAclFile ?? asOptionalString(rawAppValue.fieldAclFile),
      viewFile: files.viewFile ?? asOptionalString(rawAppValue.viewFile),
      appAclFile: files.appAclFile ?? asOptionalString(rawAppValue.appAclFile),
      recordAclFile:
        files.recordAclFile ?? asOptionalString(rawAppValue.recordAclFile),
      processFile:
        files.processFile ?? asOptionalString(rawAppValue.processFile),
      settingsFile:
        files.settingsFile ?? asOptionalString(rawAppValue.settingsFile),
      notificationFile:
        files.notificationFile ??
        asOptionalString(rawAppValue.notificationFile),
      reportFile: files.reportFile ?? asOptionalString(rawAppValue.reportFile),
      actionFile: files.actionFile ?? asOptionalString(rawAppValue.actionFile),
      adminNotesFile:
        files.adminNotesFile ?? asOptionalString(rawAppValue.adminNotesFile),
      pluginFile: files.pluginFile ?? asOptionalString(rawAppValue.pluginFile),
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
  if (apiToken) {
    return { type: "apiToken", apiToken };
  }

  const username = asOptionalString(raw.username);
  const password = asOptionalString(raw.password);
  if (username && password) {
    return { type: "password", username, password };
  }

  return undefined;
}

export const ConfigParser = {
  parse: parseProjectConfig,
};
