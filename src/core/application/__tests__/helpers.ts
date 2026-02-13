import { afterEach, beforeEach } from "vitest";
import type { Container } from "@/core/application/container";
import type { SeedContainer } from "@/core/application/container/seed";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FormLayout } from "@/core/domain/formSchema/entity";
import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type {
  KintoneRecordForParameter,
  KintoneRecordForResponse,
  RecordManager,
} from "@/core/domain/seedData/ports/recordManager";
import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";

export class InMemoryFormConfigurator implements FormConfigurator {
  private fields: Map<FieldCode, FieldDefinition> = new Map();
  private layout: FormLayout = [];
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

  async getFields(): Promise<ReadonlyMap<FieldCode, FieldDefinition>> {
    this.callLog.push("getFields");
    this.checkFail("getFields");
    return new Map(this.fields);
  }

  async addFields(fields: readonly FieldDefinition[]): Promise<void> {
    this.callLog.push("addFields");
    this.checkFail("addFields");
    for (const field of fields) {
      this.fields.set(field.code, field);
    }
  }

  async updateFields(fields: readonly FieldDefinition[]): Promise<void> {
    this.callLog.push("updateFields");
    this.checkFail("updateFields");
    for (const field of fields) {
      this.fields.set(field.code, field);
    }
  }

  async deleteFields(fieldCodes: readonly FieldCode[]): Promise<void> {
    this.callLog.push("deleteFields");
    this.checkFail("deleteFields");
    for (const code of fieldCodes) {
      this.fields.delete(code);
    }
  }

  async getLayout(): Promise<FormLayout> {
    this.callLog.push("getLayout");
    this.checkFail("getLayout");
    return [...this.layout];
  }

  async updateLayout(layout: FormLayout): Promise<void> {
    this.callLog.push("updateLayout");
    this.checkFail("updateLayout");
    this.layout = [...layout];
  }

  setFields(fields: ReadonlyMap<FieldCode, FieldDefinition>): void {
    this.fields = new Map(fields);
  }

  setLayout(layout: FormLayout): void {
    this.layout = [...layout];
  }
}

export class InMemorySchemaStorage implements SchemaStorage {
  private content = "";
  callLog: string[] = [];
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  private checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `${methodName} failed (test)`,
      );
    }
  }

  async get(): Promise<string> {
    this.callLog.push("get");
    this.checkFail("get");
    return this.content;
  }

  async update(content: string): Promise<void> {
    this.callLog.push("update");
    this.checkFail("update");
    this.content = content;
  }

  setContent(content: string): void {
    this.content = content;
  }
}

export class InMemoryAppDeployer implements AppDeployer {
  deployCount = 0;
  shouldFail = false;

  async deploy(): Promise<void> {
    if (this.shouldFail) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Deploy failed (test)",
      );
    }
    this.deployCount++;
  }
}

export type TestContainer = Container & {
  formConfigurator: InMemoryFormConfigurator;
  schemaStorage: InMemorySchemaStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestContainer(): TestContainer {
  return {
    formConfigurator: new InMemoryFormConfigurator(),
    schemaStorage: new InMemorySchemaStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestContainer(): () => TestContainer {
  let container: TestContainer;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    // No cleanup needed for in-memory adapters
  });

  return () => container;
}

// Seed data test helpers

export class InMemoryRecordManager implements RecordManager {
  private records: KintoneRecordForResponse[] = [];
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
  ): Promise<readonly KintoneRecordForResponse[]> {
    this.callLog.push("getAllRecords");
    this.checkFail("getAllRecords");
    return [...this.records];
  }

  async addRecords(
    records: readonly KintoneRecordForParameter[],
  ): Promise<void> {
    this.callLog.push("addRecords");
    this.checkFail("addRecords");
    for (const record of records) {
      const id = String(this.nextId++);
      this.records.push({
        ...record,
        $id: { value: id },
      } as unknown as KintoneRecordForResponse);
    }
  }

  async updateRecords(
    records: readonly {
      id: string;
      record: KintoneRecordForParameter;
    }[],
  ): Promise<void> {
    this.callLog.push("updateRecords");
    this.checkFail("updateRecords");
    for (const { id, record } of records) {
      const index = this.records.findIndex((r) => r.$id.value === id);
      if (index !== -1) {
        this.records[index] = {
          ...record,
          $id: { value: id },
        } as unknown as KintoneRecordForResponse;
      }
    }
  }

  setRecords(records: KintoneRecordForResponse[]): void {
    this.records = [...records];
  }
}

export class InMemorySeedStorage implements SeedStorage {
  private content = "";
  callLog: string[] = [];
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  private checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `${methodName} failed (test)`,
      );
    }
  }

  async get(): Promise<string> {
    this.callLog.push("get");
    this.checkFail("get");
    return this.content;
  }

  async update(content: string): Promise<void> {
    this.callLog.push("update");
    this.checkFail("update");
    this.content = content;
  }

  setContent(content: string): void {
    this.content = content;
  }
}

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

  afterEach(() => {
    // No cleanup needed for in-memory adapters
  });

  return () => container;
}
