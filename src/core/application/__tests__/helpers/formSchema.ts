import { beforeEach } from "vitest";
import type { Container } from "@/core/application/container";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FormLayout } from "@/core/domain/formSchema/entity";
import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

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
      if (field.type === "SUBTABLE") {
        const existing = this.fields.get(field.code);
        if (existing !== undefined && existing.type === "SUBTABLE") {
          const mergedInner = new Map(existing.properties.fields);
          for (const [code, def] of field.properties.fields) {
            mergedInner.set(code, def);
          }
          this.fields.set(field.code, {
            ...existing,
            properties: { fields: mergedInner },
          });
          continue;
        }
      }
      this.fields.set(field.code, field);
    }
  }

  async updateFields(fields: readonly FieldDefinition[]): Promise<void> {
    this.callLog.push("updateFields");
    this.checkFail("updateFields");
    for (const field of fields) {
      if (field.type === "SUBTABLE") {
        const existing = this.fields.get(field.code);
        if (existing !== undefined && existing.type === "SUBTABLE") {
          const mergedInner = new Map(existing.properties.fields);
          for (const [code, def] of field.properties.fields) {
            mergedInner.set(code, def);
          }
          this.fields.set(field.code, {
            ...field,
            properties: { fields: mergedInner },
          });
          continue;
        }
      }
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

export class InMemorySchemaStorage
  extends InMemoryFileStorage
  implements SchemaStorage {}

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

  return () => container;
}
