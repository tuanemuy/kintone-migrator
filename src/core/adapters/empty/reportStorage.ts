import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";

export class EmptyReportStorage implements ReportStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
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
