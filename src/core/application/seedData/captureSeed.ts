import { SeedSerializer } from "@/core/domain/seedData/services/seedSerializer";
import type { UpsertKey } from "@/core/domain/seedData/valueObject";
import { UpsertKey as UpsertKeyVO } from "@/core/domain/seedData/valueObject";
import type { SeedServiceArgs } from "../container/seed";
import type { CaptureSeedOutput } from "./dto";

export type CaptureSeedInput = {
  readonly keyField?: string;
};

export async function captureSeed({
  container,
  input,
}: SeedServiceArgs<CaptureSeedInput>): Promise<CaptureSeedOutput> {
  const key: UpsertKey | null = input.keyField
    ? UpsertKeyVO.create(input.keyField)
    : null;

  const existingRecords = await container.recordManager.getAllRecords();

  const records = existingRecords.map(({ record }) => record);

  const seedText = SeedSerializer.serialize({ key, records });

  const existing = await container.seedStorage.get();

  return {
    seedText,
    recordCount: records.length,
    hasExistingSeed: existing.exists,
  };
}
