import { stringify as stringifyYaml } from "yaml";
import { buildAppFilePaths } from "@/core/domain/projectConfig/appFilePaths";
import { resolveAppName, type SpaceApp } from "@/core/domain/space/entity";

export type GenerateProjectConfigInput = Readonly<{
  apps: readonly SpaceApp[];
  domain: string;
  guestSpaceId?: string;
}>;

function deduplicateAppName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  let counter = 2;
  let candidate = `${baseName}-${counter}`;
  while (usedNames.has(candidate)) {
    counter++;
    candidate = `${baseName}-${counter}`;
  }
  usedNames.add(candidate);
  return candidate;
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
      files: buildAppFilePaths(name),
    };
  }

  // auth is intentionally omitted from the generated config to avoid writing
  // credentials to disk. The CLI prompts the user to add auth settings manually.
  const config: Record<string, unknown> = {
    domain: input.domain,
  };

  if (input.guestSpaceId) {
    config.guestSpaceId = input.guestSpaceId;
  }

  config.apps = apps;

  return stringifyYaml(config, { lineWidth: 0 });
}
