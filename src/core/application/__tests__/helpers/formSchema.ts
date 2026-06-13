import type { FormSchemaContainer } from "@/core/application/container/formSchema";
import { ConflictError, ConflictErrorCode } from "@/core/application/error";
import type { FormLayout } from "@/core/domain/formSchema/entity";
import type {
  ExpectedRevision,
  FormConfigurator,
} from "@/core/domain/formSchema/ports/formConfigurator";
import type { SchemaStateStorage } from "@/core/domain/formSchema/ports/schemaStateStorage";
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
  testConfigCodec,
} from "./shared";

export class InMemoryFormConfigurator
  extends FakeBase
  implements FormConfigurator
{
  private fields: Map<FieldCode, FieldDefinition> = new Map();
  private layout: FormLayout = [];
  private revision = "1";
  /** Records the expected revision passed to each mutation method, in order. */
  readonly expectedRevisions: Array<ExpectedRevision> = [];
  /**
   * When set, the next mutation (add/update/delete/layout) throws this error
   * before mutating. Used to simulate the kintone adapter translating an API
   * optimistic-lock failure (409 / GAIA_CO02) into a ConflictError mid-apply
   * (TOCTOU), which the in-memory double cannot otherwise reproduce.
   */
  private pendingMutationError: Error | undefined = undefined;

  /**
   * Arms the test double so the next mutation throws an API optimistic-lock
   * ConflictError (ConflictErrorCode.Conflict — distinct from the push-drift
   * SchemaDrift code), as the real adapter would on a 409.
   */
  failNextMutationWithOptimisticLock(): void {
    this.pendingMutationError = new ConflictError(
      ConflictErrorCode.Conflict,
      "The form was modified concurrently (revision conflict — GAIA_CO02). Please retry the operation.",
    );
  }

  private consumeMutationError(): void {
    if (this.pendingMutationError !== undefined) {
      const error = this.pendingMutationError;
      this.pendingMutationError = undefined;
      throw error;
    }
  }

  async getFields(): Promise<ReadonlyMap<FieldCode, FieldDefinition>> {
    this.trackCall("getFields");
    return new Map(this.fields);
  }

  async getRevision(): Promise<string> {
    this.trackCall("getRevision");
    return this.revision;
  }

  async addFields(
    fields: readonly FieldDefinition[],
    expectedRevision?: ExpectedRevision,
  ): Promise<void> {
    this.trackCall("addFields");
    this.consumeMutationError();
    this.expectedRevisions.push(expectedRevision);
    for (const field of fields) {
      this.fields.set(field.code, field);
    }
  }

  async updateFields(
    fields: readonly FieldDefinition[],
    expectedRevision?: ExpectedRevision,
  ): Promise<void> {
    this.trackCall("updateFields");
    this.consumeMutationError();
    this.expectedRevisions.push(expectedRevision);
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

  async deleteFields(
    fieldCodes: readonly FieldCode[],
    expectedRevision?: ExpectedRevision,
  ): Promise<void> {
    this.trackCall("deleteFields");
    this.consumeMutationError();
    this.expectedRevisions.push(expectedRevision);
    for (const code of fieldCodes) {
      const field = this.fields.get(code);
      if (field?.type === "SUBTABLE") {
        for (const innerCode of field.properties.fields.keys()) {
          this.fields.delete(innerCode);
        }
      }
      this.fields.delete(code);
    }
  }

  async getLayout(): Promise<FormLayout> {
    this.trackCall("getLayout");
    return [...this.layout];
  }

  async updateLayout(
    layout: FormLayout,
    expectedRevision?: ExpectedRevision,
  ): Promise<void> {
    this.trackCall("updateLayout");
    this.consumeMutationError();
    this.expectedRevisions.push(expectedRevision);
    this.layout = [...layout];
  }

  setFields(fields: ReadonlyMap<FieldCode, FieldDefinition>): void {
    this.fields = new Map(fields);
  }

  setLayout(layout: FormLayout): void {
    this.layout = [...layout];
  }

  setRevision(revision: string): void {
    this.revision = revision;
  }
}

export class InMemorySchemaStateStorage
  extends InMemoryFileStorage
  implements SchemaStateStorage {}

export class InMemorySchemaStorage
  extends InMemoryFileStorage
  implements SchemaStorage {}

export type TestFormSchemaContainer = FormSchemaContainer & {
  formConfigurator: InMemoryFormConfigurator;
  schemaStorage: InMemorySchemaStorage;
  schemaStateStorage: InMemorySchemaStateStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestFormSchemaContainer(): TestFormSchemaContainer {
  return {
    configCodec: testConfigCodec,
    formConfigurator: new InMemoryFormConfigurator(),
    schemaStorage: new InMemorySchemaStorage(),
    schemaStateStorage: new InMemorySchemaStateStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestFormSchemaContainer(): () => TestFormSchemaContainer {
  return setupContainer(createTestFormSchemaContainer);
}
