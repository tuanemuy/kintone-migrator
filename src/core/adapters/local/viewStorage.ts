import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileViewStorage(filePath: string): ViewStorage {
  return createLocalFileStorage(filePath, "view file");
}
