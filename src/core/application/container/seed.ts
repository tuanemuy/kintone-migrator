import type { RecordManager } from "@/core/domain/seedData/ports/recordManager";
import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";

export type SeedContainer = {
  recordManager: RecordManager;
  seedStorage: SeedStorage;
};

export type SeedServiceArgs<T = undefined> = T extends undefined
  ? { container: SeedContainer }
  : { container: SeedContainer; input: T };
