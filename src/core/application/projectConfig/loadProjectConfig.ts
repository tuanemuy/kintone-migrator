import type { ProjectConfig } from "@/core/domain/projectConfig/entity";
import { ConfigParser } from "@/core/domain/projectConfig/services/configParser";
import { parseYamlText } from "../parseYamlText";

export type LoadProjectConfigInput = Readonly<{
  content: string;
}>;

/**
 * Pure function that parses YAML text into a ProjectConfig.
 * Intentionally does not use the container/context object pattern
 * because it has no external dependencies (no I/O, no ports).
 */
export function loadProjectConfig(
  input: LoadProjectConfigInput,
): ProjectConfig {
  const raw = parseYamlText(input.content, "Project config");
  return ConfigParser.parse(raw);
}
