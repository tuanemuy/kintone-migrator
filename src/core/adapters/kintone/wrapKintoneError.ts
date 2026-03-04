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
const KINTONE_MAINTENANCE_MODE_CODE = "GAIA_NO02";

function formatMessage(message: string, error: unknown): string {
  if (error instanceof KintoneRestAPIError && error.message) {
    return `${message}: ${error.message}`;
  }
  if (error instanceof Error && error.message) {
    return `${message}: ${error.message}`;
  }
  return message;
}

/**
 * Converts an unknown error thrown during a kintone API call into the
 * appropriate application-layer error.
 *
 * - {@link BusinessRuleError} and {@link ApplicationError} (including all
 *   subclasses such as {@link SystemError}, {@link ValidationError}, etc.)
 *   are re-thrown as-is so that errors raised inside a try block are never
 *   silently converted.
 * - {@link KintoneRestAPIError} is mapped by HTTP status (401/403/404/409/400)
 *   and kintone-specific codes (`GAIA_CO02` revision conflict, `GAIA_NO02`
 *   maintenance mode).
 * - Everything else becomes a {@link SystemError} with code `ExternalApiError`.
 *
 * **Note on 400 mapping**: All 400 errors (except `GAIA_CO02`) are mapped to
 * {@link ValidationError}. This is intentionally simplified — some 400 codes
 * (e.g. `GAIA_RE18` record limit, `GAIA_AP01` app unavailable) may have
 * different semantics, but for this CLI tool a single `ValidationError`
 * with the original kintone message in the error detail is sufficient.
 *
 * @throws {UnauthenticatedError} when kintone returns 401
 * @throws {ForbiddenError} when kintone returns 403 (non-GAIA_NO02)
 * @throws {SystemError} when kintone returns 403 with GAIA_NO02 (maintenance mode)
 * @throws {NotFoundError} when kintone returns 404
 * @throws {ConflictError} when kintone returns 409 or GAIA_CO02
 * @throws {ValidationError} when kintone returns 400 (non-GAIA_CO02)
 * @throws {SystemError} for all other kintone errors and unknown errors
 */
export function wrapKintoneError(error: unknown, message: string): never {
  if (isBusinessRuleError(error)) throw error;
  if (error instanceof ApplicationError) throw error;

  const detail = formatMessage(message, error);

  if (error instanceof KintoneRestAPIError) {
    if (error.status === 401) {
      throw new UnauthenticatedError(
        UnauthenticatedErrorCode.InvalidCredentials,
        detail,
        error,
      );
    }
    if (error.status === 403) {
      if (error.code === KINTONE_MAINTENANCE_MODE_CODE) {
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          `${detail} (app is in maintenance mode — GAIA_NO02)`,
          error,
        );
      }
      throw new ForbiddenError(
        ForbiddenErrorCode.InsufficientPermissions,
        detail,
        error,
      );
    }
    if (error.status === 404) {
      throw new NotFoundError(NotFoundErrorCode.NotFound, detail, error);
    }
    if (error.code === KINTONE_REVISION_CONFLICT_CODE) {
      throw new ConflictError(
        ConflictErrorCode.Conflict,
        `${detail} (revision conflict — GAIA_CO02). Please retry the operation.`,
        error,
      );
    }
    if (error.status === 409) {
      throw new ConflictError(ConflictErrorCode.Conflict, detail, error);
    }
    if (error.status === 400) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        detail,
        error,
      );
    }
  }

  throw new SystemError(SystemErrorCode.ExternalApiError, detail, error);
}
