import { stringify as stringifyYaml } from "yaml";
import { resolveAppName, type SpaceApp } from "@/core/domain/space/entity";
import { buildAppFilePaths } from "./appFilePaths";

export type GenerateProjectConfigInput = Readonly<{
  apps: readonly SpaceApp[];
  domain: string;
  guestSpaceId?: string;
}>;

export function generateProjectConfig(
  input: GenerateProjectConfigInput,
): string {
  const apps: Record<string, { appId: string; files: Record<string, string> }> =
    {};

  for (const app of input.apps) {
    const name = resolveAppName(app);
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
