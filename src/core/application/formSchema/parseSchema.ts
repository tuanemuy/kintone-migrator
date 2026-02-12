import { isBusinessRuleError } from "@/core/domain/error";
import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import { ValidationError, ValidationErrorCode } from "../error";

export function parseSchemaText(rawText: string): Schema {
  try {
    return SchemaParser.parse(rawText);
  } catch (error) {
    if (isBusinessRuleError(error)) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        error.message,
        error,
      );
    }
    throw error;
  }
}
