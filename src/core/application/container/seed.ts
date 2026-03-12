import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { RecordManager } from "@/core/domain/seedData/ports/recordManager";
import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";
import type { ServiceArgs } from "../types";

export type SeedContainer = {
  configCodec: ConfigCodec;
  recordManager: RecordManager;
  seedStorage: SeedStorage;
};

export type SeedServiceArgs<T = undefined> = ServiceArgs<SeedContainer, T>;
