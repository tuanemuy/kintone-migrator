export type SpaceApp = Readonly<{
  appId: string;
  code: string;
  name: string;
}>;

// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control character match for path sanitization
const UNSAFE_PATH_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

function sanitizeForFileSystem(name: string): string {
  return name.replace(UNSAFE_PATH_CHARS, "_").replace(/\.+$/, "");
}

export function resolveAppName(app: SpaceApp): string {
  const raw = app.code !== "" ? app.code : `app-${app.appId}`;
  return sanitizeForFileSystem(raw);
}
