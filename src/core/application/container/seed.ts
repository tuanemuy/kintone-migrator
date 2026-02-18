import type { RecordManager } from "@/core/domain/seedData/ports/recordManager";
import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";
import type { ServiceArgs } from "../types";

export type SeedContainer = {
  recordManager: RecordManager;
  seedStorage: SeedStorage;
};

export type SeedServiceArgs<T = undefined> = ServiceArgs<SeedContainer, T>;
