import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFilePluginStorage(filePath: string): PluginStorage {
  return createLocalFileStorage(filePath, "plugin file");
}
