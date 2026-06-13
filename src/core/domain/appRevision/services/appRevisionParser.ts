import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
import { AppRevisionErrorCode } from "../errorCode";
import type { AppRevision } from "../valueObject";

/**
 * Parses pre-parsed (codec-decoded) data into an {@link AppRevision}.
 *
 * This is the inverse of {@link AppRevisionSerializer}. The domain layer does
 * not depend on YAML; the application layer handles codec decoding before
 * calling this.
 */
export const AppRevisionParser = {
  parse: (parsed: unknown): AppRevision => {
    if (!isRecord(parsed)) {
      throw new BusinessRuleError(
        AppRevisionErrorCode.ArInvalidStructure,
        "App revision must be an object",
      );
    }

    const { revision } = parsed;
    if (typeof revision !== "string" || revision.length === 0) {
      throw new BusinessRuleError(
        AppRevisionErrorCode.ArInvalidStructure,
        'App revision must have a non-empty "revision" string',
      );
    }

    return { revision };
  },
};
