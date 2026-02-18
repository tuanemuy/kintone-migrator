import { stringify as stringifyYaml } from "yaml";
import { buildAppFilePaths } from "@/core/domain/projectConfig/appFilePaths";
import { AppName } from "@/core/domain/projectConfig/valueObject";
import { resolveAppName, type SpaceApp } from "@/core/domain/space/entity";
import { deduplicateName } from "@/lib/deduplicateName";

export type GenerateProjectConfigInput = Readonly<{
  apps: readonly SpaceApp[];
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
  const config: {
    domain: string;
    guestSpaceId?: string;
    apps: Record<string, { appId: string; files: Record<string, string> }>;
  } = {
    domain: input.domain,
    apps,
  };

  if (input.guestSpaceId !== undefined) {
    config.guestSpaceId = input.guestSpaceId;
  }

  return stringifyYaml(config, { lineWidth: 0 });
}
