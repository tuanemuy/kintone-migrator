import { beforeEach } from "vitest";
import type { SeedContainer } from "@/core/application/container/seed";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { SeedRecordWithId } from "@/core/domain/seedData/entity";
import type { RecordManager } from "@/core/domain/seedData/ports/recordManager";
import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";
import type { SeedRecord } from "@/core/domain/seedData/valueObject";
import { InMemoryFileStorage } from "./shared";

export class InMemoryRecordManager implements RecordManager {
  private records: SeedRecordWithId[] = [];
  private nextId = 1;
  callLog: string[] = [];
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

  async getAllRecords(
    _condition?: string,
  ): Promise<readonly SeedRecordWithId[]> {
    this.callLog.push("getAllRecords");
    this.checkFail("getAllRecords");
    return [...this.records];
  }

  async addRecords(records: readonly SeedRecord[]): Promise<void> {
    this.callLog.push("addRecords");
    this.checkFail("addRecords");
    for (const record of records) {
      const id = String(this.nextId++);
      this.records.push({ id, record });
    }
  }

  async updateRecords(
    records: readonly {
      id: string;
      record: SeedRecord;
    }[],
  ): Promise<void> {
    this.callLog.push("updateRecords");
    this.checkFail("updateRecords");
    for (const { id, record } of records) {
      const index = this.records.findIndex((r) => r.id === id);
      if (index !== -1) {
        this.records[index] = { id, record };
      }
    }
  }

  async deleteAllRecords(): Promise<{ deletedCount: number }> {
    this.callLog.push("deleteAllRecords");
    this.checkFail("deleteAllRecords");
    const deletedCount = this.records.length;
    this.records = [];
    return { deletedCount };
  }

  setRecords(records: SeedRecordWithId[]): void {
    this.records = [...records];
  }
}

export class InMemorySeedStorage
  extends InMemoryFileStorage
  implements SeedStorage {}

export type TestSeedContainer = SeedContainer & {
  recordManager: InMemoryRecordManager;
  seedStorage: InMemorySeedStorage;
};

export function createTestSeedContainer(): TestSeedContainer {
  return {
    recordManager: new InMemoryRecordManager(),
    seedStorage: new InMemorySeedStorage(),
  };
}

export function setupTestSeedContainer(): () => TestSeedContainer {
  let container: TestSeedContainer;

  beforeEach(() => {
    container = createTestSeedContainer();
  });

  return () => container;
}
