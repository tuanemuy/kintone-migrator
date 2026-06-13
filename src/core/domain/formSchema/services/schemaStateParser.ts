import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
import { FormSchemaErrorCode } from "../errorCode";
import type { SchemaState } from "../state";
import { SchemaParser } from "./schemaParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link SchemaState}.
 *
 * The top-level `revision` is extracted and the remainder (the captured
 * `layout`) is parsed via {@link SchemaParser}. This is the inverse of
 * {@link SchemaStateSerializer}. The domain layer does not depend on YAML;
 * the application layer handles codec decoding before calling this.
 */
export const SchemaStateParser = {
  parse: (parsed: unknown): SchemaState => {
    if (!isRecord(parsed)) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.FsInvalidStateStructure,
        "Schema state must be an object",
      );
    }

    const { revision, ...rest } = parsed;
    if (typeof revision !== "string" || revision.length === 0) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.FsInvalidStateStructure,
        'Schema state must have a non-empty "revision" string',
      );
    }

    const schema = SchemaParser.parse(rest);

    return { revision, schema };
  },
};
