import { stringify as stringifyYaml } from "yaml";
import type { SeedData } from "../entity";

export const SeedSerializer = {
  serialize: (seedData: SeedData): string => {
    const serialized = {
      key: seedData.key as string,
      records: seedData.records.map((record) => {
        const plain: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
          plain[key] = value;
        }
        return plain;
      }),
    };

    return stringifyYaml(serialized, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
