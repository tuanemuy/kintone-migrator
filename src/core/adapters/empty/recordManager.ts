import type {
  KintoneRecordForParameter,
  KintoneRecordForResponse,
  RecordManager,
} from "@/core/domain/seedData/ports/recordManager";

export class EmptyRecordManager implements RecordManager {
  async getAllRecords(
    _condition?: string,
  ): Promise<readonly KintoneRecordForResponse[]> {
    throw new Error("EmptyRecordManager.getAllRecords not implemented");
  }

  async addRecords(
    _records: readonly KintoneRecordForParameter[],
  ): Promise<void> {
    throw new Error("EmptyRecordManager.addRecords not implemented");
  }

  async updateRecords(
    _records: readonly {
      id: string;
      record: KintoneRecordForParameter;
    }[],
  ): Promise<void> {
    throw new Error("EmptyRecordManager.updateRecords not implemented");
  }
}
