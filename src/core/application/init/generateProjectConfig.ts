import { type AppInfo, resolveAppName } from "@/core/domain/app/entity";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { buildAppFilePaths } from "@/core/domain/projectConfig/appFilePaths";
import { AppName } from "@/core/domain/projectConfig/valueObject";
import { deduplicateName } from "@/lib/deduplicateName";
import { stringifyConfig } from "../stringifyConfig";

export type GenerateProjectConfigInput = Readonly<{
  apps: readonly AppInfo[];
  domain: string;
  guestSpaceId?: string;
  baseDir?: string;
}>;

function deduplicateAppName(baseName: string, usedNames: Set<string>): AppName {
  return AppName.create(
    deduplicateName(baseName, usedNames, {
      separator: "-",
      startCounter: 2,
    }),
  );
}

export function generateProjectConfig(
  input: GenerateProjectConfigInput,
  codec: ConfigCodec,
): string {
  const apps: Record<string, { appId: string; files: Record<string, string> }> =
    {};
  const usedNames = new Set<string>();

  for (const app of input.apps) {
    const baseName = resolveAppName(app);
    const name = deduplicateAppName(baseName, usedNames);
    apps[name] = {
      appId: app.appId,
      files: buildAppFilePaths(name, input.baseDir),
    };
  }

  // auth is intentionally omitted from the generated config to avoid writing
  // credentials to disk. The CLI prompts the user to add auth settings manually.
  const config = {
    domain: input.domain,
    ...(input.guestSpaceId !== undefined
      ? { guestSpaceId: input.guestSpaceId }
      : {}),
    apps,
  };

  return stringifyConfig(codec, config);
}
