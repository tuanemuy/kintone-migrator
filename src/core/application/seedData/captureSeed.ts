import { RecordConverter } from "@/core/domain/seedData/services/recordConverter";
import { SeedSerializer } from "@/core/domain/seedData/services/seedSerializer";
import type { SeedRecord, UpsertKey } from "@/core/domain/seedData/valueObject";
import { UpsertKey as UpsertKeyVO } from "@/core/domain/seedData/valueObject";
import type { SeedServiceArgs } from "../container/seed";
import type { CaptureSeedOutput } from "./dto";

export type CaptureSeedInput = {
  readonly keyField: string;
};

export async function captureSeed({
  container,
  input,
}: SeedServiceArgs<CaptureSeedInput>): Promise<CaptureSeedOutput> {
  const key: UpsertKey = UpsertKeyVO.create(input.keyField);

  const kintoneRecords = await container.recordManager.getAllRecords();

  const records: SeedRecord[] = kintoneRecords.map(
    RecordConverter.fromKintoneRecord,
  );

  const seedText = SeedSerializer.serialize({ key, records });

  const existingText = await container.seedStorage.get();

  return {
    seedText,
    recordCount: records.length,
    hasExistingSeed: existingText.length > 0,
  };
}
