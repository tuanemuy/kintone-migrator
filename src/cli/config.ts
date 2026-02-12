import * as v from "valibot";

const CliConfigSchema = v.object({
  KINTONE_DOMAIN: v.pipe(v.string(), v.nonEmpty("KINTONE_DOMAIN is required")),
  KINTONE_USERNAME: v.pipe(
    v.string(),
    v.nonEmpty("KINTONE_USERNAME is required"),
  ),
  KINTONE_PASSWORD: v.pipe(
    v.string(),
    v.nonEmpty("KINTONE_PASSWORD is required"),
  ),
  KINTONE_APP_ID: v.pipe(v.string(), v.nonEmpty("KINTONE_APP_ID is required")),
  SCHEMA_FILE_PATH: v.optional(v.string(), "schema.yaml"),
});

export type CliConfig = {
  baseUrl: string;
  username: string;
  password: string;
  appId: string;
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
  "app-id": {
    type: "string" as const,
    short: "a",
    description: "kintone app ID (overrides KINTONE_APP_ID env var)",
  },
  "schema-file": {
    type: "string" as const,
    short: "f",
    description: "Schema file path (default: schema.yaml)",
  },
};

export function resolveConfig(cliValues: {
  domain?: string;
  username?: string;
  password?: string;
  "app-id"?: string;
  "schema-file"?: string;
}): CliConfig {
  const result = v.safeParse(CliConfigSchema, {
    KINTONE_DOMAIN: cliValues.domain ?? process.env.KINTONE_DOMAIN ?? "",
    KINTONE_USERNAME: cliValues.username ?? process.env.KINTONE_USERNAME ?? "",
    KINTONE_PASSWORD: cliValues.password ?? process.env.KINTONE_PASSWORD ?? "",
    KINTONE_APP_ID: cliValues["app-id"] ?? process.env.KINTONE_APP_ID ?? "",
    SCHEMA_FILE_PATH: cliValues["schema-file"] ?? process.env.SCHEMA_FILE_PATH,
  });

  if (!result.success) {
    const missing = result.issues.map((issue) => issue.message).join("\n  ");
    throw new Error(`Missing required configuration:\n  ${missing}`);
  }

  return {
    baseUrl: `https://${result.output.KINTONE_DOMAIN}`,
    username: result.output.KINTONE_USERNAME,
    password: result.output.KINTONE_PASSWORD,
    appId: result.output.KINTONE_APP_ID,
    schemaFilePath: result.output.SCHEMA_FILE_PATH,
  };
}
