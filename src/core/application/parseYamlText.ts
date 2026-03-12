import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { ValidationError, ValidationErrorCode } from "./error";

export function parseYamlText(
  codec: ConfigCodec,
  rawText: string,
  domainLabel: string,
): unknown {
  if (rawText.trim().length === 0) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `${domainLabel} config text is empty`,
    );
  }

  try {
    return codec.parse(rawText);
  } catch (cause) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `Failed to parse ${domainLabel} YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    );
  }
}
