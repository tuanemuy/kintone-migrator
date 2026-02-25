import type { FormSchemaContainer } from "@/core/application/container";
import type { FormLayout } from "@/core/domain/formSchema/entity";
import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
} from "./shared";

export class InMemoryFormConfigurator
  extends FakeBase
  implements FormConfigurator
{
  private fields: Map<FieldCode, FieldDefinition> = new Map();
  private layout: FormLayout = [];

  async getFields(): Promise<ReadonlyMap<FieldCode, FieldDefinition>> {
    this.trackCall("getFields");
    return new Map(this.fields);
  }

  async addFields(fields: readonly FieldDefinition[]): Promise<void> {
    this.trackCall("addFields");
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
    this.trackCall("updateFields");
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
    this.trackCall("deleteFields");
    for (const code of fieldCodes) {
      this.fields.delete(code);
    }
  }

  async getLayout(): Promise<FormLayout> {
    this.trackCall("getLayout");
    return [...this.layout];
  }

  async updateLayout(layout: FormLayout): Promise<void> {
    this.trackCall("updateLayout");
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

export type TestFormSchemaContainer = FormSchemaContainer & {
  formConfigurator: InMemoryFormConfigurator;
  schemaStorage: InMemorySchemaStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestFormSchemaContainer(): TestFormSchemaContainer {
  return {
    formConfigurator: new InMemoryFormConfigurator(),
    schemaStorage: new InMemorySchemaStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestFormSchemaContainer(): () => TestFormSchemaContainer {
  return setupContainer(createTestFormSchemaContainer);
}
