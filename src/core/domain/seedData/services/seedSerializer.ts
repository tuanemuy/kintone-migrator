import type { SeedData } from "../entity";

export const SeedSerializer = {
  serialize: (seedData: SeedData): Record<string, unknown> => {
    const records = seedData.records.map(
      (record) => ({ ...record }) as Record<string, unknown>,
    );

    return seedData.key !== null ? { key: seedData.key, records } : { records };
  },
};
