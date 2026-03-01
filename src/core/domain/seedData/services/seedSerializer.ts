import { stringify as stringifyYaml } from "yaml";
import type { SeedData } from "../entity";

export const SeedSerializer = {
  serialize: (seedData: SeedData): string => {
    const records = seedData.records.map(
      (record) => ({ ...record }) as Record<string, unknown>,
    );

    const serialized =
      seedData.key !== null ? { key: seedData.key, records } : { records };

    return stringifyYaml(serialized, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
