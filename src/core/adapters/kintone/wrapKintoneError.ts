import { KintoneRestAPIError } from "@kintone/rest-api-client";
import {
  ConflictError,
  ConflictErrorCode,
  ForbiddenError,
  ForbiddenErrorCode,
  NotFoundError,
  NotFoundErrorCode,
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
  UnauthenticatedErrorCode,
} from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";

const KINTONE_REVISION_CONFLICT_CODE = "GAIA_CO02";

/**
 * Converts an unknown error thrown during a kintone API call into the
 * appropriate application-layer error.
 *
 * - {@link BusinessRuleError} and {@link SystemError} are re-thrown as-is.
 * - {@link KintoneRestAPIError} is mapped by HTTP status (401/403/404/409)
 *   and the kintone-specific `GAIA_CO02` code (revision conflict).
 * - Everything else becomes a {@link SystemError} with code `ExternalApiError`.
 */
export function wrapKintoneError(error: unknown, message: string): never {
  if (isBusinessRuleError(error)) throw error;
  if (error instanceof SystemError) throw error;

  if (error instanceof KintoneRestAPIError) {
    if (error.status === 401) {
      throw new UnauthenticatedError(
        UnauthenticatedErrorCode.InvalidCredentials,
        message,
        error,
      );
    }
    if (error.status === 403) {
      throw new ForbiddenError(
        ForbiddenErrorCode.InsufficientPermissions,
        message,
        error,
      );
    }
    if (error.status === 404) {
      throw new NotFoundError(NotFoundErrorCode.NotFound, message, error);
    }
    if (error.status === 409 || error.code === KINTONE_REVISION_CONFLICT_CODE) {
      throw new ConflictError(ConflictErrorCode.Conflict, message, error);
    }
  }

  throw new SystemError(SystemErrorCode.ExternalApiError, message, error);
}
