import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class EmptyReportStorage implements ReportStorage {
  async get(): Promise<StorageResult> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyReportStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyReportStorage.update not implemented",
    );
  }
}
