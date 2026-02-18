import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import { isRecord } from "@/core/domain/typeGuards";
import type { AdminNotesConfig } from "../entity";
import { AdminNotesErrorCode } from "../errorCode";

export const AdminNotesConfigParser = {
  parse: (rawText: string): AdminNotesConfig => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnEmptyConfigText,
        "Admin notes config text is empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch (error) {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnInvalidConfigYaml,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!isRecord(parsed)) {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnInvalidConfigStructure,
        "Config must be a YAML object",
      );
    }

    const obj = parsed;

    if (typeof obj.content !== "string") {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnInvalidConfigStructure,
        'Config must have a "content" string property',
      );
    }

    if (typeof obj.includeInTemplateAndDuplicates !== "boolean") {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnInvalidConfigStructure,
        'Config must have an "includeInTemplateAndDuplicates" boolean property',
      );
    }

    return {
      content: obj.content,
      includeInTemplateAndDuplicates: obj.includeInTemplateAndDuplicates,
    };
  },
};
