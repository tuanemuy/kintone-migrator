import { join } from "node:path";
import type { AppEntry } from "@/core/domain/projectConfig/entity";

export type ResolveFilePathOptions = Readonly<{
  cliValue: string | undefined;
  envVar: string | undefined;
  appFileField: ((app: AppEntry) => string | undefined) | undefined;
  app: AppEntry | undefined;
  defaultDir: string;
  defaultFileName: string;
}>;

export function resolveFilePath(options: ResolveFilePathOptions): string {
  return (
    options.cliValue ??
    options.envVar ??
    (options.app && options.appFileField?.(options.app)) ??
    (options.app
      ? join(options.defaultDir, `${options.app.name}.yaml`)
      : options.defaultFileName)
  );
}
