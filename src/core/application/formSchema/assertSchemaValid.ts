import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaValidator } from "@/core/domain/formSchema/services/schemaValidator";
import { ValidationError, ValidationErrorCode } from "../error";

export function assertSchemaValid(schema: Schema): void {
  const validationResult = SchemaValidator.validate(schema);
  if (!validationResult.isValid) {
    const messages = validationResult.issues
      .filter((i) => i.severity === "error")
      .map((i) => `[${i.fieldCode}] ${i.message}`)
      .join("\n  ");
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `Schema validation failed:\n  ${messages}`,
    );
  }
}
