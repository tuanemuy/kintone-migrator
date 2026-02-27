// Diff types

export type PluginDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  pluginId: string;
  details: string;
}>;

export type PluginDiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type PluginDiff = Readonly<{
  entries: readonly PluginDiffEntry[];
  summary: PluginDiffSummary;
  isEmpty: boolean;
}>;
