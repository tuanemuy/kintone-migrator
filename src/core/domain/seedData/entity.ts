import type { SeedRecord, UpsertKey } from "./valueObject";

// SeedData
export type SeedData = Readonly<{
  key: UpsertKey;
  records: readonly SeedRecord[];
}>;

// SeedRecordWithId
export type SeedRecordWithId = Readonly<{
  id: string;
  record: SeedRecord;
}>;

// UpsertPlan
export type UpsertPlan = Readonly<{
  toAdd: readonly SeedRecord[];
  toUpdate: readonly SeedRecordWithId[];
  unchanged: number;
}>;
