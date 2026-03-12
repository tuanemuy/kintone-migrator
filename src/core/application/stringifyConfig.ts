import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { SystemError, SystemErrorCode } from "./error";

export function stringifyConfig(
  codec: ConfigCodec,
  data: Record<string, unknown> | readonly unknown[],
): string {
  try {
    return codec.stringify(data);
  } catch (cause) {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      `Failed to serialize config: ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    );
  }
}
