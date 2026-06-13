import type { ActionStateStorage } from "@/core/domain/action/ports/actionStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileActionStateStorage(
  filePath: string,
): ActionStateStorage {
  return createLocalFileStorage(filePath, "action state file");
}
