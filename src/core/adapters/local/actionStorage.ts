import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileActionStorage(filePath: string): ActionStorage {
  return createLocalFileStorage(filePath, "action file");
}
