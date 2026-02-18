import { SeedParser } from "@/core/domain/seedData/services/seedParser";
import { UpsertPlanner } from "@/core/domain/seedData/services/upsertPlanner";
import type { SeedServiceArgs } from "../container/seed";
import { ValidationError, ValidationErrorCode } from "../error";
import type { UpsertSeedOutput } from "./dto";

export type UpsertSeedInput = {
  readonly clean?: boolean;
};

export async function upsertSeed({
  container,
  input,
}: SeedServiceArgs<UpsertSeedInput>): Promise<UpsertSeedOutput> {
  const result = await container.seedStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Seed file not found",
    );
  }
  const seedData = SeedParser.parse(result.content);

  if (input.clean) {
    const { deletedCount } = await container.recordManager.deleteAllRecords();

    if (seedData.records.length > 0) {
      await container.recordManager.addRecords(seedData.records);
    }

    return {
      added: seedData.records.length,
      updated: 0,
      unchanged: 0,
      deleted: deletedCount,
      total: seedData.records.length,
    };
  }

  if (seedData.key === null) {
    if (seedData.records.length > 0) {
      await container.recordManager.addRecords(seedData.records);
    }
    return {
      added: seedData.records.length,
      updated: 0,
      unchanged: 0,
      deleted: 0,
      total: seedData.records.length,
    };
  }

  const existingRecords = await container.recordManager.getAllRecords();

  const plan = UpsertPlanner.plan(
    seedData.key,
    seedData.records,
    existingRecords,
  );

  if (plan.toAdd.length > 0) {
    await container.recordManager.addRecords(plan.toAdd);
  }

  if (plan.toUpdate.length > 0) {
    await container.recordManager.updateRecords(plan.toUpdate);
  }

  return {
    added: plan.toAdd.length,
    updated: plan.toUpdate.length,
    unchanged: plan.unchanged,
    deleted: 0,
    total: plan.toAdd.length + plan.toUpdate.length + plan.unchanged,
  };
}
