import { access, readFile } from "node:fs/promises";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { KintoneAuth } from "@/core/application/container/cli";
import {
  SystemError,
  SystemErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import type { MultiAppExecutor } from "@/core/application/projectConfig/executeMultiApp";
import { executeMultiApp } from "@/core/application/projectConfig/executeMultiApp";
import { loadProjectConfig } from "@/core/application/projectConfig/loadProjectConfig";
import { resolveExecutionPlan } from "@/core/application/projectConfig/resolveExecutionPlan";
import { buildAppFilePaths } from "@/core/domain/projectConfig/appFilePaths";
import type {
  AppEntry,
  AuthConfig,
  ExecutionPlan,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import {
  type CliConfig,
  parseApiTokens,
  validateKintoneDomain,
} from "./config";
import { printAppHeader, printMultiAppResult } from "./output";

export const DEFAULT_CONFIG_PATH = "kintone-migrator.yaml";

export type MultiAppCliValues = {
  app?: string;
  all?: boolean;
  config?: string;
  domain?: string;
  username?: string;
  password?: string;
  "api-token"?: string;
  "app-id"?: string;
  "guest-space-id"?: string;
  "schema-file"?: string;
};

export type ResolveTargetResult =
  | { readonly mode: "single-legacy" }
  | {
      readonly mode: "single-app";
      readonly plan: ExecutionPlan;
      readonly config: ProjectConfig;
    }
  | {
      readonly mode: "multi-app";
      readonly plan: ExecutionPlan;
      readonly config: ProjectConfig;
    }
  | { readonly mode: "list-apps"; readonly config: ProjectConfig };

export function validateExclusiveArgs(values: MultiAppCliValues): void {
  if (values.app && values.all) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "--app and --all cannot be used together",
    );
  }
  if (values["app-id"] && values.app) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "--app-id and --app cannot be used together",
    );
  }
  if (values["app-id"] && values.all) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "--app-id and --all cannot be used together",
    );
  }
}

export async function resolveTarget(
  values: MultiAppCliValues,
): Promise<ResolveTargetResult> {
  validateExclusiveArgs(values);

  // Mode 1: Direct --app-id → legacy single app mode
  if (values["app-id"]) {
    return { mode: "single-legacy" };
  }

  const configPath = values.config ?? DEFAULT_CONFIG_PATH;

  // Mode 2/3: --app or --all → requires config file
  if (values.app || values.all) {
    const content = await readConfigFile(configPath);
    const config = loadProjectConfig({ content });
    const plan = resolveExecutionPlan({
      config,
      appName: values.app,
      all: values.all,
    });

    if (values.app) {
      return { mode: "single-app", plan, config };
    }
    return { mode: "multi-app", plan, config };
  }

  // Mode 4: No flags, config file exists → show available apps
  if (await configFileExists(configPath)) {
    const content = await readConfigFile(configPath);
    const config = loadProjectConfig({ content });
    return { mode: "list-apps", config };
  }

  // Mode 5: No flags, no config file → legacy fallback
  return { mode: "single-legacy" };
}

export function resolveAppCliConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: MultiAppCliValues,
): CliConfig {
  // Merge priority: CLI args > env vars > app-level config > top-level config
  const domain =
    cliValues.domain ??
    process.env.KINTONE_DOMAIN ??
    app.domain ??
    projectConfig.domain;

  if (!domain) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `No domain configured for app "${app.name}"`,
    );
  }

  const auth = resolveAuthForApp(app, projectConfig, cliValues);
  const guestSpaceId =
    cliValues["guest-space-id"] ??
    process.env.KINTONE_GUEST_SPACE_ID ??
    app.guestSpaceId ??
    projectConfig.guestSpaceId;

  return {
    baseUrl: validateKintoneDomain(domain),
    auth,
    appId: app.appId,
    guestSpaceId,
    schemaFilePath:
      cliValues["schema-file"] ??
      process.env.SCHEMA_FILE_PATH ??
      app.schemaFile ??
      buildAppFilePaths(app.name).schema,
  };
}

function resolveAuthForApp(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: MultiAppCliValues,
): KintoneAuth {
  // CLI args take highest priority
  const cliApiToken = cliValues["api-token"] ?? process.env.KINTONE_API_TOKEN;
  const cliUsername = cliValues.username ?? process.env.KINTONE_USERNAME;
  const cliPassword = cliValues.password ?? process.env.KINTONE_PASSWORD;

  if (cliApiToken) {
    return { type: "apiToken", apiToken: parseApiTokens(cliApiToken) };
  }

  if (cliUsername && cliPassword) {
    return { type: "password", username: cliUsername, password: cliPassword };
  }

  // App-level auth config
  const appAuth = app.auth ?? projectConfig.auth;
  if (appAuth) {
    return convertAuthConfig(appAuth);
  }

  throw new ValidationError(
    ValidationErrorCode.InvalidInput,
    `No auth configured for app "${app.name}" (set via CLI args, env vars, or config file)`,
  );
}

function convertAuthConfig(auth: AuthConfig): KintoneAuth {
  if (auth.type === "apiToken") {
    return { type: "apiToken", apiToken: auth.apiToken };
  }
  return { type: "password", username: auth.username, password: auth.password };
}

export function printAvailableApps(config: ProjectConfig): void {
  p.log.info("Available apps in project config:");
  for (const [name, entry] of config.apps) {
    const deps =
      entry.dependsOn.length > 0
        ? pc.dim(` (depends on: ${entry.dependsOn.join(", ")})`)
        : "";
    p.log.message(
      `  ${pc.cyan(name)} ${pc.dim(`(app: ${entry.appId})`)}${deps}`,
    );
  }
  p.log.info(
    `\nUse ${pc.cyan("--app <name>")} to target a specific app, or ${pc.cyan("--all")} to run all apps.`,
  );
}

export type MultiAppHandlers = {
  readonly singleLegacy: () => Promise<void>;
  readonly singleApp: (app: AppEntry, config: ProjectConfig) => Promise<void>;
  readonly multiApp: (
    plan: ExecutionPlan,
    config: ProjectConfig,
  ) => Promise<void>;
};

export async function routeMultiApp(
  values: MultiAppCliValues,
  handlers: MultiAppHandlers,
): Promise<void> {
  const target = await resolveTarget(values);

  if (target.mode === "single-legacy") {
    await handlers.singleLegacy();
    return;
  }

  if (target.mode === "list-apps") {
    printAvailableApps(target.config);
    return;
  }

  if (target.mode === "single-app") {
    const app = target.plan.orderedApps[0];
    if (!app) {
      throw new SystemError(
        SystemErrorCode.InternalServerError,
        "Execution plan has no apps",
      );
    }
    printAppHeader(app.name, app.appId);
    await handlers.singleApp(app, target.config);
    return;
  }

  await handlers.multiApp(target.plan, target.config);
}

export async function runMultiAppWithFailCheck(
  plan: ExecutionPlan,
  executor: MultiAppExecutor,
  successMessage?: string,
): Promise<void> {
  const multiResult = await executeMultiApp(plan, executor);
  printMultiAppResult(multiResult);

  if (multiResult.hasFailure) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "Execution stopped due to failure.",
    );
  }

  if (successMessage) {
    p.log.success(successMessage);
  }
}

async function configFileExists(configPath: string): Promise<boolean> {
  try {
    await access(configPath);
    return true;
  } catch {
    return false;
  }
}

async function readConfigFile(configPath: string): Promise<string> {
  try {
    return await readFile(configPath, "utf-8");
  } catch (cause) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `Config file not found: ${configPath}`,
      cause,
    );
  }
}
