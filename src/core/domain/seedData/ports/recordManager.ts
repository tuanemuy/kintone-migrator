import type { SeedRecordWithId } from "../entity";
import type { SeedRecord } from "../valueObject";

export interface RecordManager {
  getAllRecords(condition?: string): Promise<readonly SeedRecordWithId[]>;
  addRecords(records: readonly SeedRecord[]): Promise<void>;
  updateRecords(
    records: readonly { id: string; record: SeedRecord }[],
  ): Promise<void>;
  deleteAllRecords(): Promise<{ deletedCount: number }>;
}
