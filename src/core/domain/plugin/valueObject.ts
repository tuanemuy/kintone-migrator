import type { DiffResult } from "../diff";

export type PluginDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  pluginId: string;
  details: string;
}>;

export type PluginDiff = DiffResult<PluginDiffEntry>;
