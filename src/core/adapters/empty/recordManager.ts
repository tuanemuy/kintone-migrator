import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { SeedRecordWithId } from "@/core/domain/seedData/entity";
import type { RecordManager } from "@/core/domain/seedData/ports/recordManager";
import type { SeedRecord } from "@/core/domain/seedData/valueObject";

export class EmptyRecordManager implements RecordManager {
  async getAllRecords(
    _condition?: string,
  ): Promise<readonly SeedRecordWithId[]> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordManager.getAllRecords not implemented",
    );
  }

  async addRecords(_records: readonly SeedRecord[]): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordManager.addRecords not implemented",
    );
  }

  async updateRecords(
    _records: readonly {
      id: string;
      record: SeedRecord;
    }[],
  ): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordManager.updateRecords not implemented",
    );
  }

  async deleteAllRecords(): Promise<{ deletedCount: number }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordManager.deleteAllRecords not implemented",
    );
  }
}
