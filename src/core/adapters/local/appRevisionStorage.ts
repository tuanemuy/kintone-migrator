import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileAppRevisionStorage(
  filePath: string,
): AppRevisionStorage {
  return createLocalFileStorage(filePath, "app revision file");
}
