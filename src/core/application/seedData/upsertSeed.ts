import { RecordConverter } from "@/core/domain/seedData/services/recordConverter";
import { SeedParser } from "@/core/domain/seedData/services/seedParser";
import { UpsertPlanner } from "@/core/domain/seedData/services/upsertPlanner";
import type { SeedServiceArgs } from "../container/seed";
import type { UpsertSeedOutput } from "./dto";

export async function upsertSeed({
  container,
}: SeedServiceArgs): Promise<UpsertSeedOutput> {
  const rawText = await container.seedStorage.get();
  const seedData = SeedParser.parse(rawText);

  const existingRecords = await container.recordManager.getAllRecords();

  const plan = UpsertPlanner.plan(
    seedData.key,
    seedData.records,
    existingRecords,
  );

  if (plan.toAdd.length > 0) {
    const kintoneRecords = plan.toAdd.map(RecordConverter.toKintoneRecord);
    await container.recordManager.addRecords(kintoneRecords);
  }

  if (plan.toUpdate.length > 0) {
    const kintoneUpdates = plan.toUpdate.map((item) => ({
      id: item.id,
      record: RecordConverter.toKintoneRecord(item.record),
    }));
    await container.recordManager.updateRecords(kintoneUpdates);
  }

  return {
    added: plan.toAdd.length,
    updated: plan.toUpdate.length,
    unchanged: plan.unchanged,
    total: plan.toAdd.length + plan.toUpdate.length + plan.unchanged,
  };
}
