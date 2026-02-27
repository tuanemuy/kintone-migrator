import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import { createEmptyStorage } from "./storage";

export const emptyPluginStorage: PluginStorage =
  createEmptyStorage("EmptyPluginStorage");
