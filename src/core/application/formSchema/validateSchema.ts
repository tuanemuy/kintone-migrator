import type { Schema } from "@/core/domain/formSchema/entity";
import {
  SchemaValidator,
  type ValidationResult,
} from "@/core/domain/formSchema/services/schemaValidator";
import type { ValidateServiceArgs } from "../container/validate";
import {
  isValidationError,
  ValidationError,
  ValidationErrorCode,
} from "../error";
import { parseSchemaText } from "./parseSchema";

export type ValidateSchemaOutput = Readonly<{
  parseError?: string;
  validationResult?: ValidationResult;
  fieldCount: number;
}>;

export async function validateSchema({
  container,
}: ValidateServiceArgs): Promise<ValidateSchemaOutput> {
  const result = await container.schemaStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Schema file not found",
    );
  }

  // try-catch is intentional here: parse errors are returned as a value
  // (parseError field) instead of being thrown, so the caller can display
  // both parse errors and validation results in a unified report.
  let schema: Schema;
  try {
    schema = parseSchemaText(container.configCodec, result.content);
  } catch (error) {
    if (isValidationError(error)) {
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
