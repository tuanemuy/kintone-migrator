export type SpaceApp = Readonly<{
  appId: string;
  code: string;
  name: string;
}>;

export function resolveAppName(app: SpaceApp): string {
  return app.code !== "" ? app.code : `app-${app.appId}`;
}
