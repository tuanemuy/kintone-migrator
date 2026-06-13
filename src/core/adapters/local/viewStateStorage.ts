import type { ViewStateStorage } from "@/core/domain/view/ports/viewStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileViewStateStorage(
  filePath: string,
): ViewStateStorage {
  return createLocalFileStorage(filePath, "view state file");
}
