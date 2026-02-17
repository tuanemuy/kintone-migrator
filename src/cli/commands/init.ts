import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { createInitCliContainer } from "@/core/application/container/initCli";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import {
  type CaptureResult,
  captureAllForApp,
} from "@/core/application/init/captureAllForApp";
import { fetchSpaceApps } from "@/core/application/init/fetchSpaceApps";
import { generateProjectConfig } from "@/core/application/init/generateProjectConfig";
import { resolveAppName } from "@/core/domain/space/entity";
import { kintoneArgs, resolveAuth } from "../config";
import { handleCliError } from "../handleError";

const DEFAULT_CONFIG_PATH = "kintone-migrator.yaml";

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
    description: "Output config file path (default: kintone-migrator.yaml)",
  },
  yes: {
    type: "boolean" as const,
    short: "y",
    description: "Skip confirmation prompts",
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
};

function printCaptureResults(results: readonly CaptureResult[]): void {
  for (const result of results) {
    if (result.success) {
      p.log.success(`  ${pc.green("\u2713")} ${result.domain}`);
    } else {
      p.log.error(`  ${pc.red("\u2717")} ${result.domain}`);
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

      const kintoneDomain = values.domain ?? process.env.KINTONE_DOMAIN;
      if (!kintoneDomain) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "Missing required configuration:\n  KINTONE_DOMAIN is required",
        );
      }

      const apiToken =
        values["api-token"] ?? process.env.KINTONE_API_TOKEN ?? undefined;
      const username =
        values.username ?? process.env.KINTONE_USERNAME ?? undefined;
      const password =
        values.password ?? process.env.KINTONE_PASSWORD ?? undefined;

      const baseUrl = `https://${kintoneDomain}`;
      const auth = resolveAuth(apiToken, username, password);
      const guestSpaceId =
        values["guest-space-id"] ?? process.env.KINTONE_GUEST_SPACE_ID;
      const configPath = values.output ?? DEFAULT_CONFIG_PATH;
      const skipConfirm = values.yes ?? false;

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
        spaceReader,
        spaceId: values["space-id"],
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

      // Generate and write config
      const configText = generateProjectConfig({
        apps,
        domain: kintoneDomain,
        guestSpaceId,
      });
      await projectConfigStorage.update(configText);
      p.log.success(`Config written to: ${pc.cyan(configPath)}`);
      p.log.info(
        `Add authentication settings (auth) to ${pc.cyan(configPath)} before running commands.`,
      );

      // Run captures for each app
      for (const app of apps) {
        const appName = resolveAppName(app);
        p.log.step(`\n=== [${pc.bold(appName)}] (appId: ${app.appId}) ===`);

        const cs = p.spinner();
        cs.start(`Capturing all domains for ${appName}...`);
        const results = await captureAllForApp({
          baseUrl,
          auth,
          appId: app.appId,
          guestSpaceId,
          appName,
        });
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;
        cs.stop(
          `Captured ${successCount}/${results.length} domains.` +
            (failCount > 0 ? pc.red(` (${failCount} failed)`) : ""),
        );

        printCaptureResults(results);
      }

      p.log.success("\nProject initialization complete.");
    } catch (error) {
      handleCliError(error);
    }
  },
});
