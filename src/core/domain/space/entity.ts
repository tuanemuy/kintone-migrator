import { AppName } from "@/core/domain/projectConfig/valueObject";

export type SpaceApp = Readonly<{
  appId: string;
  code: string;
  name: string;
}>;

// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control character match for path sanitization
const UNSAFE_PATH_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

function sanitizeForFileSystem(name: string): string {
  const sanitized = name.replace(UNSAFE_PATH_CHARS, "_").replace(/\.+$/, "");
  return sanitized === "" ? "_" : sanitized;
}

export function resolveAppName(app: SpaceApp): AppName {
  const raw = app.code !== "" ? app.code : `app-${app.appId}`;
  return AppName.create(sanitizeForFileSystem(raw));
}
