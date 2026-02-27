import type { ProjectConfigStorage } from "@/core/domain/projectConfig/ports/projectConfigStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileProjectConfigStorage(
  filePath: string,
): ProjectConfigStorage {
  return createLocalFileStorage(filePath, "project config file");
}
