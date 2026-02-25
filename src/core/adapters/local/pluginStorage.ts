import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import { LocalFileStorage } from "./storage";

export class LocalFilePluginStorage
  extends LocalFileStorage
  implements PluginStorage {}
