import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { SystemError, SystemErrorCode } from "./error";

export function stringifyToYaml(
  codec: ConfigCodec,
  data: Record<string, unknown>,
): string {
  try {
    return codec.stringify(data);
  } catch (cause) {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      `Failed to serialize config to YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    );
  }
}
