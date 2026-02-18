import { parse as parseYaml } from "yaml";
import type { ProjectConfig } from "@/core/domain/projectConfig/entity";
import { ConfigParser } from "@/core/domain/projectConfig/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

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
  let raw: unknown;
  try {
    raw = parseYaml(input.content);
  } catch (cause) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Invalid YAML syntax in config file",
      cause,
    );
  }

  return ConfigParser.parse(raw);
}
