import type { ReportContainer } from "@/core/application/container/report";
import type { ReportConfig } from "@/core/domain/report/entity";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
} from "./shared";

export class InMemoryReportConfigurator
  extends FakeBase
  implements ReportConfigurator
{
  private reports: Record<string, ReportConfig> = {};
  private revision = "1";
  lastUpdateParams: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  } | null = null;

  async getReports(): Promise<{
    reports: Readonly<Record<string, ReportConfig>>;
    revision: string;
  }> {
    this.trackCall("getReports");
    return { reports: { ...this.reports }, revision: this.revision };
  }

  async updateReports(params: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.trackCall("updateReports");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setReports(reports: Record<string, ReportConfig>, revision?: string): void {
    this.reports = { ...reports };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryReportStorage
  extends InMemoryFileStorage
  implements ReportStorage {}

export type TestReportContainer = ReportContainer & {
  reportConfigurator: InMemoryReportConfigurator;
  reportStorage: InMemoryReportStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestReportContainer(): TestReportContainer {
  return {
    reportConfigurator: new InMemoryReportConfigurator(),
    reportStorage: new InMemoryReportStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestReportContainer(): () => TestReportContainer {
  return setupContainer(createTestReportContainer);
}
