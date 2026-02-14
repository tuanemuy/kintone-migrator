import { readFile } from "node:fs/promises";
import { isBusinessRuleError } from "@/core/domain/error";
import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import {
  SchemaValidator,
  type ValidationResult,
} from "@/core/domain/formSchema/services/schemaValidator";
import { SystemError, SystemErrorCode } from "../error";

export type ValidateSchemaInput = Readonly<{
  schemaFilePath: string;
}>;

export type ValidateSchemaOutput = Readonly<{
  parseError?: string;
  validationResult?: ValidationResult;
  fieldCount: number;
}>;

export async function validateSchema(
  input: ValidateSchemaInput,
): Promise<ValidateSchemaOutput> {
  let rawText: string;
  try {
    rawText = await readFile(input.schemaFilePath, "utf-8");
  } catch (cause) {
    throw new SystemError(
      SystemErrorCode.StorageError,
      `Failed to read schema file: ${input.schemaFilePath}`,
      cause,
    );
  }

  let schema: Schema;
  try {
    schema = SchemaParser.parse(rawText);
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
