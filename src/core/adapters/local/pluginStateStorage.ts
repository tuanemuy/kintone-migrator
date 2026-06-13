import type { PluginStateStorage } from "@/core/domain/plugin/ports/pluginStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFilePluginStateStorage(
  filePath: string,
): PluginStateStorage {
  return createLocalFileStorage(filePath, "plugin state file");
}
