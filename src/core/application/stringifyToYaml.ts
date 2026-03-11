import { configCodec } from "@/core/adapters/yaml/configCodec";
import { SystemError, SystemErrorCode } from "./error";

export function stringifyToYaml(data: Record<string, unknown>): string {
  try {
    return configCodec.stringify(data);
  } catch (cause) {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      `Failed to serialize config to YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    );
  }
}
