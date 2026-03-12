import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ProjectConfig } from "@/core/domain/projectConfig/entity";
import { ConfigParser } from "@/core/domain/projectConfig/services/configParser";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";

export type LoadProjectConfigInput = Readonly<{
  content: string;
}>;

/**
 * Pure function that parses config text into a ProjectConfig.
 * Intentionally does not use the container/context object pattern because
 * it has no I/O ports; the ConfigCodec is a lightweight serialization port.
 */
export function loadProjectConfig(
  input: LoadProjectConfigInput,
  codec: ConfigCodec,
): ProjectConfig {
  const raw = parseConfigText(codec, input.content, "Project config");
  return wrapBusinessRuleError(() => ConfigParser.parse(raw));
}
