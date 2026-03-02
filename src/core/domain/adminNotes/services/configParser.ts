import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "@/core/domain/services/yamlConfigParser";
import type { AdminNotesConfig } from "../entity";
import { AdminNotesErrorCode } from "../errorCode";

export const AdminNotesConfigParser = {
  parse: (rawText: string): AdminNotesConfig => {
    const parsed = parseYamlConfig(
      rawText,
      {
        emptyConfigText: AdminNotesErrorCode.AnEmptyConfigText,
        invalidConfigYaml: AdminNotesErrorCode.AnInvalidConfigYaml,
        invalidConfigStructure: AdminNotesErrorCode.AnInvalidConfigStructure,
      },
      "Admin notes",
    );

    if (typeof parsed.content !== "string") {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnInvalidConfigStructure,
        'Config must have a "content" string property',
      );
    }

    if (typeof parsed.includeInTemplateAndDuplicates !== "boolean") {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnInvalidConfigStructure,
        'Config must have an "includeInTemplateAndDuplicates" boolean property',
      );
    }

    return {
      content: parsed.content,
      includeInTemplateAndDuplicates: parsed.includeInTemplateAndDuplicates,
    };
  },
};
