import type { ReportConfig } from "../entity";

export interface ReportConfigurator {
  getReports(): Promise<{
    reports: Readonly<Record<string, ReportConfig>>;
    revision: string;
  }>;
  updateReports(params: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  }): Promise<{ revision: string }>;
}
