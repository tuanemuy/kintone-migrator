export type PluginConfig = Readonly<{
  id: string;
  name: string;
  enabled: boolean;
}>;

export type PluginsConfig = Readonly<{
  plugins: readonly PluginConfig[];
}>;
