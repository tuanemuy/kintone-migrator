import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileSeedStorage(filePath: string): SeedStorage {
  return createLocalFileStorage(filePath, "seed file");
}
