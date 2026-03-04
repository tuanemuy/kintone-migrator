import { SystemError, SystemErrorCode } from "@/core/application/error";

export function parseKintoneIntegerField(
  raw: string,
  fieldName: string,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected non-integer ${fieldName} from kintone API: ${raw}`,
    );
  }
  return n;
}
