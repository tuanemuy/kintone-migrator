import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { createCliCaptureContainers } from "@/core/application/container/captureAllCli";
import { createInitCliContainer } from "@/core/application/container/initCli";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import {
  type CaptureResult,
  captureAllForApp,
} from "@/core/application/init/captureAllForApp";
import { fetchSpaceApps } from "@/core/application/init/fetchSpaceApps";
import { generateProjectConfig } from "@/core/application/init/generateProjectConfig";
import { buildAppFilePaths } from "@/core/domain/projectConfig/appFilePaths";
import { resolveAppName } from "@/core/domain/space/entity";
import { kintoneArgs, resolveAuth, validateKintoneDomain } from "../config";
import {
  formatErrorForDisplay,
  handleCliError,
  logError,
} from "../handleError";
import { DEFAULT_CONFIG_PATH } from "../projectConfig";

const initArgs = {
  "space-id": {
    type: "string" as const,
    short: "s",
    description: "kintone space ID",
    required: true as const,
  },
  domain: kintoneArgs.domain,
  username: kintoneArgs.username,
  password: kintoneArgs.password,
  "api-token": kintoneArgs["api-token"],
  "guest-space-id": kintoneArgs["guest-space-id"],
  output: {
    type: "string" as const,
    short: "o",
    description: "Output directory",
  },
  yes: {
    type: "boolean" as const,
    short: "y",
    description: "Skip confirmation prompts",
  },
  "dry-run": {
    type: "boolean" as const,
    short: "n",
    description: "Preview what would be created without writing any files",
  },
};

type InitCliValues = {
  "space-id": string;
  domain?: string;
  username?: string;
  password?: string;
  "api-token"?: string;
  "guest-space-id"?: string;
  output?: string;
  yes?: boolean;
  "dry-run"?: boolean;
};

function printCaptureResults(results: readonly CaptureResult[]): void {
  for (const result of results) {
    if (result.success) {
      p.log.success(`  ${pc.green("\u2713")} ${result.domain}`);
    } else {
      p.log.error(
        `  ${pc.red("\u2717")} ${result.domain}: ${pc.dim(formatErrorForDisplay(result.error))}`,
      );
      logError(result.error);
    }
  }
}

export default define({
  name: "init",
  description: "Initialize project from a kintone space",
  args: initArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as InitCliValues;

      const spaceId = values["space-id"];
      if (!/^\d+$/.test(spaceId)) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          `Invalid space ID: "${spaceId}" (must be a numeric value)`,
        );
      }

      const kintoneDomain = values.domain ?? process.env.KINTONE_DOMAIN;
      if (!kintoneDomain) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "Missing required configuration:\n  KINTONE_DOMAIN is required",
        );
      }

      const apiToken = values["api-token"] ?? process.env.KINTONE_API_TOKEN;
      const username = values.username ?? process.env.KINTONE_USERNAME;
      const password = values.password ?? process.env.KINTONE_PASSWORD;

      const baseUrl = validateKintoneDomain(kintoneDomain);
      const auth = resolveAuth(apiToken, username, password);
      const guestSpaceId =
        values["guest-space-id"] ?? process.env.KINTONE_GUEST_SPACE_ID;
      const output = values.output;
      const configPath = DEFAULT_CONFIG_PATH;
      const skipConfirm = values.yes ?? false;
      const dryRun = values["dry-run"] ?? false;

      const { spaceReader, projectConfigStorage } = createInitCliContainer({
        baseUrl,
        auth,
        guestSpaceId,
        configFilePath: configPath,
      });

      // Fetch space apps
      const s = p.spinner();
      s.start("Fetching space info...");
      const apps = await fetchSpaceApps({
        container: { spaceReader },
        input: { spaceId },
      });
      s.stop(`Found ${apps.length} app(s) in the space.`);

      // Display found apps
      p.log.info("Apps:");
      for (const app of apps) {
        const name = resolveAppName(app);
        p.log.message(
          `  ${pc.cyan(name)} ${pc.dim(`(appId: ${app.appId}, name: ${app.name})`)}`,
        );
      }

      // Generate config text (used by both normal and dry-run modes)
      // Auth is intentionally omitted from the generated file to prevent
      // credentials from being committed to version control. The user is
      // expected to supply auth via environment variables or add it manually.
      const configText = generateProjectConfig({
        apps,
        domain: kintoneDomain,
        guestSpaceId,
        baseDir: output,
      });

      if (dryRun) {
        p.log.info(pc.dim("(dry-run mode - no files will be written)"));
        p.log.step(`\nConfig file: ${pc.cyan(configPath)}`);
        p.log.message(configText);

        for (const app of apps) {
          const appName = resolveAppName(app);
          const paths = buildAppFilePaths(appName, output);
          p.log.step(`\n=== [${pc.bold(appName)}] (appId: ${app.appId}) ===`);
          p.log.message("  Files that would be created:");
          for (const [domain, filePath] of Object.entries(paths)) {
            p.log.message(`    ${domain}: ${pc.dim(filePath)}`);
          }
        }

        p.log.success("\nDry run complete. No files were written.");
        return;
      }

      // Check if config file exists
      const existing = await projectConfigStorage.get();

      if (existing.exists && !skipConfirm) {
        const shouldOverwrite = await p.confirm({
          message: `${configPath} already exists. Overwrite?`,
        });
        if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
          p.log.warn("Aborted.");
          return;
        }
      }

      // Write config
      await projectConfigStorage.update(configText);
      p.log.success(`Config written to: ${pc.cyan(configPath)}`);

      // Run captures for each app
      for (const app of apps) {
        const appName = resolveAppName(app);
        p.log.step(`\n=== [${pc.bold(appName)}] (appId: ${app.appId}) ===`);

        const { containers, paths } = createCliCaptureContainers({
          baseUrl,
          auth,
          appId: app.appId,
          guestSpaceId,
          appName,
          baseDir: output,
        });

        const cs = p.spinner();
        cs.start(`Capturing all domains for ${appName}...`);
        const results = await captureAllForApp({
          container: containers,
          input: {
            appName,
            customizeBasePath: dirname(resolve(paths.customize)),
          },
        });
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.length - successCount;
        cs.stop(
          `Captured ${successCount}/${results.length} domains.` +
            (failCount > 0 ? pc.red(` (${failCount} failed)`) : ""),
        );

        printCaptureResults(results);
      }

      p.log.info(
        `Add authentication settings (auth) to ${pc.cyan(configPath)} or set KINTONE_API_TOKEN / KINTONE_USERNAME + KINTONE_PASSWORD environment variables.`,
      );
      p.log.success("\nProject initialization complete.");
    } catch (error) {
      handleCliError(error);
    }
  },
});
