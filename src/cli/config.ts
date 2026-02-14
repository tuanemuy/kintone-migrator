import * as v from "valibot";
import type { KintoneAuth } from "@/core/application/container/cli";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";

export {
  buildKintoneAuth,
  type KintoneAuth,
} from "@/core/application/container/cli";

const CliConfigSchema = v.object({
  KINTONE_DOMAIN: v.pipe(v.string(), v.nonEmpty("KINTONE_DOMAIN is required")),
  KINTONE_API_TOKEN: v.optional(v.string()),
  KINTONE_USERNAME: v.optional(v.string()),
  KINTONE_PASSWORD: v.optional(v.string()),
  KINTONE_APP_ID: v.pipe(v.string(), v.nonEmpty("KINTONE_APP_ID is required")),
  KINTONE_GUEST_SPACE_ID: v.optional(v.string()),
  SCHEMA_FILE_PATH: v.optional(v.string(), "schema.yaml"),
});

export type CliConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  schemaFilePath: string;
};

export const kintoneArgs = {
  domain: {
    type: "string" as const,
    short: "d",
    description: "kintone domain (overrides KINTONE_DOMAIN env var)",
  },
  username: {
    type: "string" as const,
    short: "u",
    description: "kintone username (overrides KINTONE_USERNAME env var)",
  },
  password: {
    type: "string" as const,
    short: "p",
    description: "kintone password (overrides KINTONE_PASSWORD env var)",
  },
  "api-token": {
    type: "string" as const,
    short: "t",
    description: "kintone API token (overrides KINTONE_API_TOKEN env var)",
  },
  "app-id": {
    type: "string" as const,
    short: "a",
    description: "kintone app ID (overrides KINTONE_APP_ID env var)",
  },
  "guest-space-id": {
    type: "string" as const,
    short: "g",
    description:
      "kintone guest space ID (overrides KINTONE_GUEST_SPACE_ID env var)",
  },
  "schema-file": {
    type: "string" as const,
    short: "f",
    description: "Schema file path (default: schema.yaml)",
  },
};

export const confirmArgs = {
  yes: {
    type: "boolean" as const,
    short: "y",
    description: "Skip confirmation prompts",
  },
};

export const multiAppArgs = {
  app: {
    type: "string" as const,
    description: "Target app name (from project config file)",
  },
  all: {
    type: "boolean" as const,
    description: "Run all apps in dependency order",
  },
  config: {
    type: "string" as const,
    short: "c",
    description: "Project config file path (default: kintone-migrator.yaml)",
  },
};

export function resolveConfig(cliValues: {
  domain?: string;
  username?: string;
  password?: string;
  "api-token"?: string;
  "app-id"?: string;
  "guest-space-id"?: string;
  "schema-file"?: string;
}): CliConfig {
  const result = v.safeParse(CliConfigSchema, {
    KINTONE_DOMAIN: cliValues.domain ?? process.env.KINTONE_DOMAIN ?? "",
    KINTONE_API_TOKEN:
      cliValues["api-token"] ?? process.env.KINTONE_API_TOKEN ?? undefined,
    KINTONE_USERNAME:
      cliValues.username ?? process.env.KINTONE_USERNAME ?? undefined,
    KINTONE_PASSWORD:
      cliValues.password ?? process.env.KINTONE_PASSWORD ?? undefined,
    KINTONE_APP_ID: cliValues["app-id"] ?? process.env.KINTONE_APP_ID ?? "",
    KINTONE_GUEST_SPACE_ID:
      cliValues["guest-space-id"] ??
      process.env.KINTONE_GUEST_SPACE_ID ??
      undefined,
    SCHEMA_FILE_PATH: cliValues["schema-file"] ?? process.env.SCHEMA_FILE_PATH,
  });

  if (!result.success) {
    const missing = result.issues.map((issue) => issue.message).join("\n  ");
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `Missing required configuration:\n  ${missing}`,
    );
  }

  const { output } = result;

  const auth = resolveAuth(
    output.KINTONE_API_TOKEN,
    output.KINTONE_USERNAME,
    output.KINTONE_PASSWORD,
  );

  return {
    baseUrl: `https://${output.KINTONE_DOMAIN}`,
    auth,
    appId: output.KINTONE_APP_ID,
    guestSpaceId: output.KINTONE_GUEST_SPACE_ID,
    schemaFilePath: output.SCHEMA_FILE_PATH,
  };
}

function resolveAuth(
  apiToken: string | undefined,
  username: string | undefined,
  password: string | undefined,
): CliConfig["auth"] {
  if (apiToken) {
    const tokens = apiToken.includes(",")
      ? apiToken.split(",").map((t) => t.trim())
      : apiToken;
    return { type: "apiToken", apiToken: tokens };
  }

  if (username && password) {
    return { type: "password", username, password };
  }

  throw new ValidationError(
    ValidationErrorCode.InvalidInput,
    "Missing required configuration:\n  Either KINTONE_API_TOKEN or KINTONE_USERNAME/KINTONE_PASSWORD is required",
  );
}
