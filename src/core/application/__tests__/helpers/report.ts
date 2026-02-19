import { beforeEach } from "vitest";
import type { ReportContainer } from "@/core/application/container/report";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ReportConfig } from "@/core/domain/report/entity";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryReportConfigurator implements ReportConfigurator {
  private reports: Record<string, ReportConfig> = {};
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  } | null = null;
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  private checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `${methodName} failed (test)`,
      );
    }
  }

  async getReports(): Promise<{
    reports: Readonly<Record<string, ReportConfig>>;
    revision: string;
  }> {
    this.callLog.push("getReports");
    this.checkFail("getReports");
    return { reports: { ...this.reports }, revision: this.revision };
  }

  async updateReports(params: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateReports");
    this.checkFail("updateReports");
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
  let container: TestReportContainer;

  beforeEach(() => {
    container = createTestReportContainer();
  });

  return () => container;
}
