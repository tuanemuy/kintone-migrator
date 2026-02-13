import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { ProjectConfig } from "@/core/domain/projectConfig/entity";
import { parseProjectConfig } from "@/core/domain/projectConfig/services/configParser";
import { ValidationError, ValidationErrorCode } from "../error";

export type LoadProjectConfigInput = Readonly<{
  configPath: string;
}>;

export async function loadProjectConfig(
  input: LoadProjectConfigInput,
): Promise<ProjectConfig> {
  let content: string;
  try {
    content = await readFile(input.configPath, "utf-8");
  } catch (cause) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `Config file not found: ${input.configPath}`,
      cause,
    );
  }

  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch (cause) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `Invalid YAML syntax in config file: ${input.configPath}`,
      cause,
    );
  }

  try {
    return parseProjectConfig(raw);
  } catch (cause) {
    if (cause instanceof ValidationError) throw cause;
    throw cause;
  }
}
