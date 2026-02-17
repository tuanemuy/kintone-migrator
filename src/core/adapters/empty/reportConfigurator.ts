import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ReportConfig } from "@/core/domain/report/entity";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";

export class EmptyReportConfigurator implements ReportConfigurator {
  async getReports(): Promise<{
    reports: Readonly<Record<string, ReportConfig>>;
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyReportConfigurator.getReports not implemented",
    );
  }

  async updateReports(_params: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyReportConfigurator.updateReports not implemented",
    );
  }
}
