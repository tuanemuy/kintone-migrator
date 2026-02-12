import type { FormLayout } from "@/core/domain/formSchema/entity";
import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";

export class EmptyFormConfigurator implements FormConfigurator {
  async getFields(): Promise<ReadonlyMap<FieldCode, FieldDefinition>> {
    throw new Error("EmptyFormConfigurator.getFields not implemented");
  }

  async addFields(_fields: readonly FieldDefinition[]): Promise<void> {
    throw new Error("EmptyFormConfigurator.addFields not implemented");
  }

  async updateFields(_fields: readonly FieldDefinition[]): Promise<void> {
    throw new Error("EmptyFormConfigurator.updateFields not implemented");
  }

  async deleteFields(_fieldCodes: readonly FieldCode[]): Promise<void> {
    throw new Error("EmptyFormConfigurator.deleteFields not implemented");
  }

  async getLayout(): Promise<FormLayout> {
    throw new Error("EmptyFormConfigurator.getLayout not implemented");
  }

  async updateLayout(_layout: FormLayout): Promise<void> {
    throw new Error("EmptyFormConfigurator.updateLayout not implemented");
  }
}
