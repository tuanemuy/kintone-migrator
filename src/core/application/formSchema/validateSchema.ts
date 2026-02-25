import { isBusinessRuleError } from "@/core/domain/error";
import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import {
  SchemaValidator,
  type ValidationResult,
} from "@/core/domain/formSchema/services/schemaValidator";
import type { FormSchemaContainer } from "../container";
import { ValidationError, ValidationErrorCode } from "../error";
import type { ServiceArgs } from "../types";

export type ValidateSchemaOutput = Readonly<{
  parseError?: string;
  validationResult?: ValidationResult;
  fieldCount: number;
}>;

export async function validateSchema({
  container,
}: ServiceArgs<FormSchemaContainer>): Promise<ValidateSchemaOutput> {
  const result = await container.schemaStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Schema file not found",
    );
  }

  let schema: Schema;
  try {
    schema = SchemaParser.parse(result.content);
  } catch (error) {
    if (isBusinessRuleError(error)) {
      return {
        parseError: error.message,
        fieldCount: 0,
      };
    }
    throw error;
  }

  const validationResult = SchemaValidator.validate(schema);
  return {
    validationResult,
    fieldCount: schema.fields.size,
  };
}
