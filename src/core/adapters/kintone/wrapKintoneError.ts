import { KintoneRestAPIError } from "@kintone/rest-api-client";
import {
  ApplicationError,
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
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";

const KINTONE_REVISION_CONFLICT_CODE = "GAIA_CO02";

/**
 * Converts an unknown error thrown during a kintone API call into the
 * appropriate application-layer error.
 *
 * - {@link BusinessRuleError} and {@link ApplicationError} (including all
 *   subclasses such as {@link SystemError}, {@link ValidationError}, etc.)
 *   are re-thrown as-is so that errors raised inside a try block are never
 *   silently converted.
 * - {@link KintoneRestAPIError} is mapped by HTTP status (401/403/404/409/400)
 *   and the kintone-specific `GAIA_CO02` code (revision conflict).
 * - Everything else becomes a {@link SystemError} with code `ExternalApiError`.
 *
 * @throws {UnauthenticatedError} when kintone returns 401
 * @throws {ForbiddenError} when kintone returns 403
 * @throws {NotFoundError} when kintone returns 404
 * @throws {ConflictError} when kintone returns 409 or GAIA_CO02
 * @throws {ValidationError} when kintone returns 400 (non-GAIA_CO02)
 * @throws {SystemError} for all other kintone errors and unknown errors
 */
export function wrapKintoneError(error: unknown, message: string): never {
  if (isBusinessRuleError(error)) throw error;
  if (error instanceof ApplicationError) throw error;

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
    if (error.code === KINTONE_REVISION_CONFLICT_CODE) {
      throw new ConflictError(
        ConflictErrorCode.Conflict,
        `${message} (revision conflict — GAIA_CO02)`,
        error,
      );
    }
    if (error.status === 409) {
      throw new ConflictError(ConflictErrorCode.Conflict, message, error);
    }
    if (error.status === 400) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        message,
        error,
      );
    }
  }

  throw new SystemError(SystemErrorCode.ExternalApiError, message, error);
}
