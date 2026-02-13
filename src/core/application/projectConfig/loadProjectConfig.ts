import { parse as parseYaml } from "yaml";
import type { ProjectConfig } from "@/core/domain/projectConfig/entity";
import { parseProjectConfig } from "@/core/domain/projectConfig/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export type LoadProjectConfigInput = Readonly<{
  content: string;
}>;

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

  return parseProjectConfig(raw);
}
