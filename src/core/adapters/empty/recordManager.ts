import { SystemError, SystemErrorCode } from "@/core/application/error";
import type {
  KintoneRecordForParameter,
  KintoneRecordForResponse,
  RecordManager,
} from "@/core/domain/seedData/ports/recordManager";

export class EmptyRecordManager implements RecordManager {
  async getAllRecords(
    _condition?: string,
  ): Promise<readonly KintoneRecordForResponse[]> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordManager.getAllRecords not implemented",
    );
  }

  async addRecords(
    _records: readonly KintoneRecordForParameter[],
  ): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordManager.addRecords not implemented",
    );
  }

  async updateRecords(
    _records: readonly {
      id: string;
      record: KintoneRecordForParameter;
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
